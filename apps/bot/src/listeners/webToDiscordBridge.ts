import { WebhookClient } from "discord.js";
import { prisma } from "@akd/db";
import type { RelayedMessage } from "@akd/shared";
import { redisSub } from "../lib/redis.js";

const WEB_TO_DISCORD_PATTERN = "match:*:web-to-discord";

export function registerWebToDiscordBridge() {
  redisSub.psubscribe(WEB_TO_DISCORD_PATTERN);

  redisSub.on("pmessage", async (_pattern, _channel, raw) => {
    let payload: RelayedMessage;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    if (payload.source !== "web") return;

    const discordChannel = await prisma.discordChannel.findUnique({ where: { matchId: payload.matchId } });
    if (!discordChannel?.webhookUrl) return;

    const content = [payload.content, payload.attachmentUrl].filter(Boolean).join("\n") || undefined;

    const webhook = new WebhookClient({ url: discordChannel.webhookUrl });
    await webhook
      .send({
        content,
        username: payload.authorName,
        avatarURL: payload.authorAvatarUrl ?? undefined,
      })
      .catch((err) => console.error("[bot] failed to relay web message to Discord", err));
  });
}
