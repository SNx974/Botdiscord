import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, ValidationStatus, MessageSource, applyValidation } from "@akd/db";
import { validationChannel } from "@akd/shared";
import { redisPub } from "@/lib/redis";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const status = body.status as "CONFIRMED" | "REJECTED";
  if (status !== "CONFIRMED" && status !== "REJECTED") {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const match = await prisma.match.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      teamA: { include: { members: true } },
      teamB: { include: { members: true } },
      results: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const latestResult = match.results[0];
  if (!latestResult) return NextResponse.json({ error: "no_result_to_validate" }, { status: 409 });

  const inTeamA = match.teamA.members.some((m) => m.userId === session.user.id);
  const inTeamB = match.teamB.members.some((m) => m.userId === session.user.id);
  const teamId = inTeamA ? match.teamAId : inTeamB ? match.teamBId : null;
  if (!teamId) return NextResponse.json({ error: "not_a_match_participant" }, { status: 403 });

  const outcome = await applyValidation({
    resultId: latestResult.id,
    teamId,
    userId: session.user.id,
    status: status === "CONFIRMED" ? ValidationStatus.CONFIRMED : ValidationStatus.REJECTED,
    source: MessageSource.WEB,
  });

  await redisPub.publish(validationChannel(match.id), JSON.stringify(outcome));

  return NextResponse.json(outcome);
}
