import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const discordId = String(body.discordId ?? "").trim();
  const username = String(body.username ?? "").trim();
  if (!discordId || !username) {
    return NextResponse.json({ error: "discordId_and_username_required" }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { discordId },
    create: { discordId, username },
    update: { username },
  });

  const member = await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: params.id, userId: user.id } },
    create: { teamId: params.id, userId: user.id },
    update: {},
    include: { user: true },
  });

  return NextResponse.json(member, { status: 201 });
}
