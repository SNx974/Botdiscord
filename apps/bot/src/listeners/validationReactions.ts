import { Events, type MessageReaction, type PartialMessageReaction, type User as DiscordUser, type PartialUser } from "discord.js";
import { prisma, ValidationStatus, MessageSource, applyValidation } from "@akd/db";
import { validationChannel } from "@akd/shared";
import { discordClient } from "../lib/discordClient.js";
import { redisPub } from "../lib/redis.js";
import { env } from "../env.js";

const CONFIRM = "✅";
const REJECT = "❌";

export function registerValidationReactions() {
  discordClient.on(
    Events.MessageReactionAdd,
    async (reaction: MessageReaction | PartialMessageReaction, user: DiscordUser | PartialUser) => {
      if (user.bot) return;
      if (reaction.partial) {
        const fetched = await reaction.fetch().catch(() => null);
        if (!fetched) return;
        reaction = fetched;
      }

      const emojiName = reaction.emoji.name;
      if (emojiName !== CONFIRM && emojiName !== REJECT) return;

      const result = await prisma.matchResult.findUnique({
        where: { announcementMsgId: reaction.message.id },
        include: {
          match: {
            include: {
              teamA: { include: { members: true } },
              teamB: { include: { members: true } },
            },
          },
        },
      });
      if (!result) return;

      const dbUser = await prisma.user.findUnique({ where: { discordId: user.id } });
      if (!dbUser) return;

      const { match } = result;
      const inTeamA = match.teamA.members.some((m) => m.userId === dbUser.id);
      const inTeamB = match.teamB.members.some((m) => m.userId === dbUser.id);
      const teamId = inTeamA ? match.teamAId : inTeamB ? match.teamBId : null;
      if (!teamId) return;

      const status = emojiName === CONFIRM ? ValidationStatus.CONFIRMED : ValidationStatus.REJECTED;

      const outcome = await applyValidation({
        resultId: result.id,
        teamId,
        userId: dbUser.id,
        status,
        source: MessageSource.DISCORD,
      });

      await redisPub.publish(validationChannel(match.id), JSON.stringify(outcome));

      const channel = reaction.message.channel;
      if (outcome.matchStatus === "DISPUTED" && channel.isTextBased() && "send" in channel) {
        await channel.send(
          `🚨 <@&${env.DISCORD_ADMIN_ROLE_ID}> Désaccord sur le résultat du match — intervention requise.`
        );
      }
    }
  );
}
