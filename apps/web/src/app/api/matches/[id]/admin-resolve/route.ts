import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, Role, adminResolveMatch } from "@akd/db";
import { validationChannel } from "@akd/shared";
import { redisPub } from "@/lib/redis";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const winnerTeamId = String(body.winnerTeamId ?? "");

  const match = await prisma.match.findUniqueOrThrow({
    where: { id: params.id },
    include: { results: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (winnerTeamId !== match.teamAId && winnerTeamId !== match.teamBId) {
    return NextResponse.json({ error: "invalid_winner_team" }, { status: 400 });
  }

  const latestResult = match.results[0];
  if (!latestResult) return NextResponse.json({ error: "no_result_to_resolve" }, { status: 409 });

  const outcome = await adminResolveMatch({ matchId: match.id, resultId: latestResult.id, winnerTeamId });

  await redisPub.publish(validationChannel(match.id), JSON.stringify(outcome));

  return NextResponse.json(outcome);
}
