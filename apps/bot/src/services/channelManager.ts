import {
  ChannelType,
  OverwriteType,
  PermissionsBitField,
  type Guild,
} from "discord.js";
import type { CreateMatchChannelRequest, CreateMatchChannelResponse } from "@akd/shared";
import { discordClient } from "../lib/discordClient.js";
import { env } from "../env.js";

function teamOverwrites(team: CreateMatchChannelRequest["teamA"]) {
  return team.members
    .filter((m) => m.discordId)
    .map((m) => ({
      id: m.discordId,
      // Without an explicit type, discord.js tries to resolve the id against
      // its Role/GuildMember cache to guess which one it is — member caches
      // aren't fully populated by default, so that guess fails even for real
      // members ("Supplied parameter is not a cached User or Role").
      type: OverwriteType.Member,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.AddReactions,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    }));
}

function sanitize(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").slice(0, 20);
}

export async function createMatchChannel(
  req: CreateMatchChannelRequest
): Promise<CreateMatchChannelResponse> {
  const guild: Guild = await discordClient.guilds.fetch(env.DISCORD_GUILD_ID);

  const suffix = req.label?.trim() ? sanitize(req.label) : req.matchId.slice(0, 6);
  const channelName = `match-${sanitize(req.teamA.tag ?? req.teamA.name)}-vs-${sanitize(
    req.teamB.tag ?? req.teamB.name
  )}-${suffix}`;

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: env.DISCORD_MATCH_CATEGORY_ID,
    topic: `Match ${req.matchId} — ${req.teamA.name} vs ${req.teamB.name}`,
    permissionOverwrites: [
      { id: guild.roles.everyone, type: OverwriteType.Role, deny: [PermissionsBitField.Flags.ViewChannel] },
      {
        id: env.DISCORD_ADMIN_ROLE_ID,
        type: OverwriteType.Role,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.ManageMessages,
          PermissionsBitField.Flags.SendMessages,
        ],
      },
      ...teamOverwrites(req.teamA),
      ...teamOverwrites(req.teamB),
    ],
  });

  const webhook = await channel.createWebhook({
    name: "MatchSync",
    reason: `Web <-> Discord relay for match ${req.matchId}`,
  });

  await channel.send(
    `🎮 **${req.teamA.name}** vs **${req.teamB.name}** — bon match ! Postez votre screenshot de fin de partie ici pour validation automatique du résultat.`
  );

  return {
    channelId: channel.id,
    guildId: guild.id,
    webhookId: webhook.id,
    webhookUrl: webhook.url,
  };
}

export async function deleteMatchChannel(channelId: string): Promise<void> {
  const channel = await discordClient.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased() || !("delete" in channel)) return;
  await channel.delete(`Match deleted from the dashboard`);
}
