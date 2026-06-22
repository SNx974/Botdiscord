import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MatchStatus } from "@akd/db";
import { createMatchChannel } from "@/lib/botClient";

export async function GET() {
  const matches = await prisma.match.findMany({
    include: { teamA: true, teamB: true, discordChannel: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(matches);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const teamAId = String(body.teamAId ?? "");
  const teamBId = String(body.teamBId ?? "");
  if (!teamAId || !teamBId || teamAId === teamBId) {
    return NextResponse.json({ error: "two_distinct_teams_required" }, { status: 400 });
  }

  const [teamA, teamB] = await Promise.all([
    prisma.team.findUniqueOrThrow({ where: { id: teamAId }, include: { members: { include: { user: true } } } }),
    prisma.team.findUniqueOrThrow({ where: { id: teamBId }, include: { members: { include: { user: true } } } }),
  ]);

  const match = await prisma.match.create({
    data: { teamAId, teamBId, status: MatchStatus.PENDING },
  });

  try {
    const channel = await createMatchChannel({
      matchId: match.id,
      teamA: {
        id: teamA.id,
        name: teamA.name,
        tag: teamA.tag,
        members: teamA.members.filter((m) => m.user.discordId).map((m) => ({ userId: m.userId, discordId: m.user.discordId! })),
      },
      teamB: {
        id: teamB.id,
        name: teamB.name,
        tag: teamB.tag,
        members: teamB.members.filter((m) => m.user.discordId).map((m) => ({ userId: m.userId, discordId: m.user.discordId! })),
      },
    });

    await prisma.discordChannel.create({
      data: {
        matchId: match.id,
        channelId: channel.channelId,
        guildId: channel.guildId,
        webhookId: channel.webhookId,
        webhookUrl: channel.webhookUrl,
      },
    });

    const updated = await prisma.match.update({
      where: { id: match.id },
      data: { status: MatchStatus.ACTIVE },
      include: { teamA: true, teamB: true, discordChannel: true },
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    console.error("Failed to create Discord channel for match", err);
    // Keep the Match row (status stays PENDING) so an admin can retry channel creation later.
    return NextResponse.json({ error: "channel_creation_failed", match }, { status: 502 });
  }
}
