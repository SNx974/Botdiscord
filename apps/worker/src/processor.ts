import type { Job } from "bullmq";
import { prisma, MatchStatus } from "@akd/db";
import { ocrResultChannel, type OcrScanJob, type OcrScanResult } from "@akd/shared";
import { detectText } from "./ocr/visionClient.js";
import { parseScore } from "./ocr/scoreParser.js";
import { scanScoreWithGpt4o } from "./ocr/openaiVisionClient.js";
import { scanScoreWithGemini } from "./ocr/geminiVisionClient.js";
import { scanScoreWithOllama } from "./ocr/ollamaVisionClient.js";
import type { VisionScoreResult } from "./ocr/scoreSchema.js";
import { redisPub } from "./lib/redis.js";
import { env } from "./env.js";

async function extractScore(imageUrl: string): Promise<VisionScoreResult> {
  if (env.OCR_PROVIDER === "gpt4o") {
    return scanScoreWithGpt4o(imageUrl);
  }
  if (env.OCR_PROVIDER === "gemini") {
    return scanScoreWithGemini(imageUrl);
  }
  if (env.OCR_PROVIDER === "ollama") {
    return scanScoreWithOllama(imageUrl);
  }
  const { text, raw } = await detectText(imageUrl);
  return { ...parseScore(text), raw };
}

export async function processOcrScanJob(job: Job<OcrScanJob>): Promise<void> {
  const { matchId, screenshotUrl, submittedByUserId } = job.data;

  const match = await prisma.match.findUniqueOrThrow({
    where: { id: matchId },
    include: { teamA: { include: { members: true } }, teamB: { include: { members: true } } },
  });

  const { scoreA, scoreB, confidence, submitterOutcome, raw } = await extractScore(screenshotUrl);

  const submitterTeamId = submittedByUserId
    ? match.teamA.members.some((m) => m.userId === submittedByUserId)
      ? match.teamAId
      : match.teamB.members.some((m) => m.userId === submittedByUserId)
        ? match.teamBId
        : null
    : null;

  // The end-of-game "DEFEAT"/"VICTORY" banner tells us directly which team
  // won from the submitter's perspective — far more reliable than mapping
  // raw numeric scores to a team, since neither team is labeled on screen.
  let presumedWinnerTeamId: string | null = null;
  if (submitterTeamId && submitterOutcome === "victory") {
    presumedWinnerTeamId = submitterTeamId;
  } else if (submitterTeamId && submitterOutcome === "defeat") {
    presumedWinnerTeamId = submitterTeamId === match.teamAId ? match.teamBId : match.teamAId;
  } else if (scoreA !== null && scoreB !== null && scoreA !== scoreB) {
    presumedWinnerTeamId = scoreA > scoreB ? match.teamAId : match.teamBId;
  }

  const result = await prisma.matchResult.create({
    data: {
      matchId,
      screenshotUrl,
      ocrRawData: raw as any,
      extractedScoreA: scoreA,
      extractedScoreB: scoreB,
      presumedWinnerId: presumedWinnerTeamId,
    },
  });

  await prisma.match.update({ where: { id: matchId }, data: { status: MatchStatus.AWAITING_VALIDATION } });

  const payload: OcrScanResult = {
    resultId: result.id,
    matchId,
    extractedScoreA: scoreA,
    extractedScoreB: scoreB,
    presumedWinnerTeamId,
    confidence,
  };

  await redisPub.publish(ocrResultChannel(matchId), JSON.stringify(payload));
}
