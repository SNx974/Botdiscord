import type { RelayedMessage, ValidationUpdateEvent } from "./redis.js";

/** Room name a browser client joins to receive a given match's live events. */
export const matchRoom = (matchId: string) => `match:${matchId}`;

export interface ServerToClientEvents {
  "message:new": (message: RelayedMessage) => void;
  "validation:update": (event: ValidationUpdateEvent) => void;
}

export interface ClientToServerEvents {
  "match:join": (matchId: string) => void;
  "match:leave": (matchId: string) => void;
  "message:send": (payload: { matchId: string; userId: string; content: string }) => void;
}
