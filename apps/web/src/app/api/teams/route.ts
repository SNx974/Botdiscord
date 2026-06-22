import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const teams = await prisma.team.findMany({
    include: { members: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const tag = body.tag ? String(body.tag).trim() : null;
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });

  const team = await prisma.team.create({ data: { name, tag } });
  return NextResponse.json(team, { status: 201 });
}
