import { prisma } from "../index.js";
import { MatchStatus, ValidationStatus, MessageSource } from "@prisma/client";

export interface ApplyValidationParams {
  resultId: string;
  teamId: string;
  userId: string;
  status: ValidationStatus;
  source: MessageSource;
}

export interface ValidationOutcome {
  matchId: string;
  resultId: string;
  teamId: string;
  status: ValidationStatus;
  matchStatus: Extract<MatchStatus, "AWAITING_VALIDATION" | "COMPLETED" | "DISPUTED">;
}

/**
 * Records a team's validation vote on a scanned result and resolves the match
 * once both teams have responded. Mutual consent: both CONFIRMED -> COMPLETED,
 * any REJECTED -> DISPUTED (flagged to admins), otherwise still PENDING.
 */
export async function applyValidation(params: ApplyValidationParams): Promise<ValidationOutcome> {
  const { resultId, teamId, userId, status, source } = params;

  const result = await prisma.matchResult.findUniqueOrThrow({
    where: { id: resultId },
    include: { match: true },
  });

  await prisma.resultValidation.upsert({
    where: { resultId_teamId: { resultId, teamId } },
    create: { resultId, teamId, userId, status, source },
    update: { status, userId, source },
  });

  const votes = await prisma.resultValidation.findMany({ where: { resultId } });
  const bothTeamsVoted = votes.length >= 2;
  const anyRejected = votes.some((v) => v.status === ValidationStatus.REJECTED);
  const allConfirmed = bothTeamsVoted && votes.every((v) => v.status === ValidationStatus.CONFIRMED);

  let matchStatus: ValidationOutcome["matchStatus"] = "AWAITING_VALIDATION";

  if (anyRejected) {
    matchStatus = "DISPUTED";
    await prisma.match.update({ where: { id: result.matchId }, data: { status: MatchStatus.DISPUTED } });
  } else if (allConfirmed) {
    matchStatus = "COMPLETED";
    await prisma.match.update({
      where: { id: result.matchId },
      data: {
        status: MatchStatus.COMPLETED,
        winnerId: result.presumedWinnerId,
        scoreA: result.extractedScoreA,
        scoreB: result.extractedScoreB,
      },
    });
  }

  return { matchId: result.matchId, resultId, teamId, status, matchStatus };
}

export interface AdminResolveParams {
  matchId: string;
  resultId: string;
  winnerTeamId: string;
}

/**
 * Lets an admin close a match immediately, bypassing the two-team mutual
 * consent flow — for when a team won't validate or the AI misread a result.
 */
export async function adminResolveMatch(params: AdminResolveParams): Promise<ValidationOutcome> {
  const { matchId, resultId, winnerTeamId } = params;

  const result = await prisma.matchResult.findUniqueOrThrow({ where: { id: resultId } });

  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: MatchStatus.COMPLETED,
      winnerId: winnerTeamId,
      scoreA: result.extractedScoreA,
      scoreB: result.extractedScoreB,
    },
  });

  return { matchId, resultId, teamId: winnerTeamId, status: ValidationStatus.CONFIRMED, matchStatus: "COMPLETED" };
}
