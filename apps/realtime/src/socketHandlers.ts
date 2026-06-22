import type { Server, Socket } from "socket.io";
import { prisma, MessageSource, MatchStatus } from "@akd/db";
import {
  webToDiscordChannel,
  matchRoom,
  type RelayedMessage,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@akd/shared";
import { redisPub } from "./lib/redis.js";

export function registerSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    socket.on("match:join", (matchId) => {
      socket.join(matchRoom(matchId));
    });

    socket.on("match:leave", (matchId) => {
      socket.leave(matchRoom(matchId));
    });

    socket.on("message:send", async ({ matchId, userId, content }) => {
      if (!content.trim()) return;

      const match = await prisma.match.findUnique({ where: { id: matchId }, select: { status: true } });
      if (!match || match.status === MatchStatus.COMPLETED) return;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return;

      const saved = await prisma.message.create({
        data: { matchId, authorId: user.id, source: MessageSource.WEB, content },
      });

      const payload: RelayedMessage = {
        matchId,
        source: "web",
        authorId: user.id,
        authorName: user.username,
        authorAvatarUrl: user.avatarUrl,
        content,
        attachmentUrl: null,
        discordMsgId: null,
        createdAt: saved.createdAt.toISOString(),
      };

      // Broadcast immediately; the bot will relay it into Discord but will
      // recognize its own webhook echo and skip re-publishing it back to us.
      io.to(matchRoom(matchId)).emit("message:new", payload);
      await redisPub.publish(webToDiscordChannel(matchId), JSON.stringify(payload));
    });
  });
}
