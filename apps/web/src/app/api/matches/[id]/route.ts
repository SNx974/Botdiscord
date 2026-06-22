import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
