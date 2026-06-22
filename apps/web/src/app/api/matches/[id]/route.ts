import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteMatchChannel } from "@/lib/botClient";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      teamA: { include: { members: { include: { user: true } } } },
      teamB: { include: { members: { include: { user: true } } } },
      winner: true,
      discordChannel: true,
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
      results: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { validations: true },
      },
    },
  });

  if (!match) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(match);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: { discordChannel: true },
  });
  if (!match) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (match.discordChannel) {
    await deleteMatchChannel(match.discordChannel.channelId);
  }

  await prisma.match.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
