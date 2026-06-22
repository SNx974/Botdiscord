import { prisma } from "@akd/db";
import { redisSub } from "../lib/redis.js";
import { lockMatchChannel } from "../services/channelManager.js";

const VALIDATION_PATTERN = "match:*:validation";

interface ValidationEvent {
  matchId: string;
  matchStatus: "AWAITING_VALIDATION" | "COMPLETED" | "DISPUTED";
}

export function registerMatchLockListener() {
  redisSub.psubscribe(VALIDATION_PATTERN);

  redisSub.on("pmessage", async (pattern, _channel, raw) => {
    if (pattern !== VALIDATION_PATTERN) return;

    let event: ValidationEvent;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }
    if (event.matchStatus !== "COMPLETED") return;

    const discordChannel = await prisma.discordChannel.findUnique({ where: { matchId: event.matchId } });
    if (!discordChannel) return;

    const match = await prisma.match.findUnique({
      where: { id: event.matchId },
      include: {
        teamA: { include: { members: { include: { user: true } } } },
        teamB: { include: { members: { include: { user: true } } } },
      },
    });
    if (!match) return;

    const memberDiscordIds = [...match.teamA.members, ...match.teamB.members]
      .map((m) => m.user.discordId)
      .filter((id): id is string => Boolean(id));

    await lockMatchChannel(discordChannel.channelId, memberDiscordIds);
  });
}
