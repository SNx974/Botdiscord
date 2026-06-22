import type { Job } from "bullmq";
import { prisma, MatchStatus } from "@akd/db";
import { ocrResultChannel, type OcrScanJob, type OcrScanResult } from "@akd/shared";
import { detectText } from "./ocr/visionClient.js";
import { parseScore } from "./ocr/scoreParser.js";
import { redisPub } from "./lib/redis.js";

export async function processOcrScanJob(job: Job<OcrScanJob>): Promise<void> {
  const { matchId, screenshotUrl } = job.data;

  const match = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });

  const { text, raw } = await detectText(screenshotUrl);
  const { scoreA, scoreB, confidence } = parseScore(text);

  const presumedWinnerTeamId =
    scoreA !== null && scoreB !== null
      ? scoreA > scoreB
        ? match.teamAId
        : scoreA < scoreB
          ? match.teamBId
          : null
      : null;

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
