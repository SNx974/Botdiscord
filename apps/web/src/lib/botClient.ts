import { INTERNAL_API_KEY_HEADER, type CreateMatchChannelRequest, type CreateMatchChannelResponse } from "@akd/shared";

export async function createMatchChannel(
  payload: CreateMatchChannelRequest
): Promise<CreateMatchChannelResponse> {
  const res = await fetch(`${process.env.BOT_INTERNAL_URL}/internal/matches/${payload.matchId}/channel`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [INTERNAL_API_KEY_HEADER]: process.env.INTERNAL_API_SECRET!,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Bot channel creation failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
