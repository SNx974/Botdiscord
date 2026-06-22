import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, MessageSource } from "@akd/db";
import { webToDiscordChannel, type RelayedMessage } from "@akd/shared";
import { uploadScreenshot } from "@/lib/storage";
import { ocrQueue } from "@/lib/queue";
import { broadcastToMatch } from "@/lib/realtimeClient";
import { redisPub } from "@/lib/redis";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "image_files_only" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const attachmentUrl = await uploadScreenshot(buffer, file.type);

  const message = await prisma.message.create({
    data: {
      matchId: params.id,
      authorId: session.user.id,
      source: MessageSource.WEB,
      content: "📸 Screenshot de fin de partie",
      attachmentUrl,
    },
  });

  const payload: RelayedMessage = {
    matchId: params.id,
    source: "web",
    authorId: session.user.id,
    authorName: session.user.name ?? "Joueur",
    authorAvatarUrl: session.user.image ?? null,
    content: message.content,
    attachmentUrl,
    discordMsgId: null,
    createdAt: message.createdAt.toISOString(),
  };

  await broadcastToMatch(params.id, "message:new", payload);
  await redisPub.publish(webToDiscordChannel(params.id), JSON.stringify(payload));

  await ocrQueue.add("scan-result", {
    matchId: params.id,
    screenshotUrl: attachmentUrl,
    submittedByUserId: session.user.id,
  });

  return NextResponse.json(message, { status: 201 });
}
