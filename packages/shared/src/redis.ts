/**
 * Redis pub/sub channel naming. Two directions per match so the bot and the
 * realtime server never re-broadcast a message the other one just relayed.
 */
export const discordToWebChannel = (matchId: string) => `match:${matchId}:discord-to-web`;
export const webToDiscordChannel = (matchId: string) => `match:${matchId}:web-to-discord`;
export const validationChannel = (matchId: string) => `match:${matchId}:validation`;
/** Published by the OCR worker once a screenshot has been scanned, consumed by the bot to post a result embed. */
export const ocrResultChannel = (matchId: string) => `match:${matchId}:ocr-result`;

export interface RelayedMessage {
  matchId: string;
  source: "discord" | "web";
  authorId: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  attachmentUrl: string | null;
  discordMsgId: string | null;
  createdAt: string;
}

export interface ValidationUpdateEvent {
  matchId: string;
  resultId: string;
  teamId: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  matchStatus: "AWAITING_VALIDATION" | "COMPLETED" | "DISPUTED";
}
