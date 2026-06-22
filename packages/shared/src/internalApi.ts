/** HTTP contract between apps/web and apps/bot's internal API (protected by INTERNAL_API_KEY). */

export interface RosterMember {
  userId: string;
  discordId: string;
}

export interface CreateMatchChannelRequest {
  matchId: string;
  teamA: { id: string; name: string; tag: string | null; members: RosterMember[] };
  teamB: { id: string; name: string; tag: string | null; members: RosterMember[] };
}

export interface CreateMatchChannelResponse {
  channelId: string;
  guildId: string;
  webhookId: string;
  webhookUrl: string;
}

export const INTERNAL_API_KEY_HEADER = "x-internal-api-key";
