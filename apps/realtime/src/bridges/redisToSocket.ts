import type { Server } from "socket.io";
import { matchRoom, type ClientToServerEvents, type ServerToClientEvents } from "@akd/shared";
import { redisSub } from "../lib/redis.js";

const DISCORD_TO_WEB = "match:*:discord-to-web";
const VALIDATION = "match:*:validation";

export function registerRedisToSocketBridge(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  redisSub.psubscribe(DISCORD_TO_WEB, VALIDATION);

  redisSub.on("pmessage", (pattern: string, _channel: string, raw: string) => {
    let payload: { matchId: string };
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    if (pattern === DISCORD_TO_WEB) {
      io.to(matchRoom(payload.matchId)).emit("message:new", payload as any);
    } else if (pattern === VALIDATION) {
      io.to(matchRoom(payload.matchId)).emit("validation:update", payload as any);
    }
  });
}
