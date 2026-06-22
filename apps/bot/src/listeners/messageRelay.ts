import { Events, type Message as DiscordMessage } from "discord.js";
import { prisma, MessageSource } from "@akd/db";
import { discordToWebChannel, type RelayedMessage } from "@akd/shared";
import { discordClient } from "../lib/discordClient.js";
import { redisPub } from "../lib/redis.js";
import { ocrQueue } from "../lib/queue.js";

export function registerMessageRelay() {
  discordClient.on(Events.MessageCreate, async (message: DiscordMessage) => {
    if (message.author.bot && !message.webhookId) return;

    const channel = await prisma.discordChannel.findUnique({ where: { channelId: message.channelId } });
    if (!channel) return;

    // Our own relay webhook echoing a web-sourced message back into Discord: don't re-relay it.
    if (message.webhookId && message.webhookId === channel.webhookId) return;

    const author = await prisma.user.findUnique({ where: { discordId: message.author.id } });
    const attachment = message.attachments.find((a) => a.contentType?.startsWith("image/"));

    const saved = await prisma.message.create({
      data: {
        matchId: channel.matchId,
        authorId: author?.id ?? null,
        source: MessageSource.DISCORD,
        discordMsgId: message.id,
        content: message.content,
        attachmentUrl: attachment?.url ?? null,
      },
    });

    const payload: RelayedMessage = {
      matchId: channel.matchId,
      source: "discord",
      authorId: author?.id ?? null,
      authorName: message.author.username,
      authorAvatarUrl: message.author.displayAvatarURL(),
      content: message.content,
      attachmentUrl: attachment?.url ?? null,
      discordMsgId: message.id,
      createdAt: saved.createdAt.toISOString(),
    };

    await redisPub.publish(discordToWebChannel(channel.matchId), JSON.stringify(payload));

    if (attachment) {
      await message.react("⏳").catch(() => null);
      await ocrQueue.add("scan-result", {
        matchId: channel.matchId,
        screenshotUrl: attachment.url,
        discordMsgId: message.id,
        submittedByUserId: author?.id,
      });
    }
  });
}
