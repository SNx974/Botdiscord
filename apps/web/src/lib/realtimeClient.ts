import { INTERNAL_API_KEY_HEADER } from "@akd/shared";

export async function broadcastToMatch(matchId: string, event: string, payload: unknown) {
  await fetch(`${process.env.REALTIME_URL}/internal/broadcast`, {
    method: "POST",
    headers: { "content-type": "application/json", [INTERNAL_API_KEY_HEADER]: process.env.INTERNAL_API_SECRET! },
    body: JSON.stringify({ matchId, event, payload }),
  }).catch((err) => console.error("Failed to broadcast to realtime server", err));
}
