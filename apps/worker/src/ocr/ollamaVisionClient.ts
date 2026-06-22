import { env } from "../env.js";
import { SCORE_SYSTEM_PROMPT, parseScoreJson, type VisionScoreResult } from "./scoreSchema.js";
import { fetchImageAsBase64 } from "./imageFetch.js";

interface OllamaChatResponse {
  message?: { content?: string };
}

/**
 * Self-hosted Ollama (e.g. moondream) — genuinely unlimited since it's your
 * own server, just slower/lower quality than a hosted vision model. Ollama's
 * /api/chat takes images as raw base64 (no data: prefix, no mimeType field).
 */
export async function scanScoreWithOllama(imageUrl: string): Promise<VisionScoreResult> {
  const { data } = await fetchImageAsBase64(imageUrl);

  const res = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: env.OLLAMA_MODEL,
      format: "json",
      stream: false,
      messages: [
        { role: "system", content: SCORE_SYSTEM_PROMPT },
        { role: "user", content: "Extrait le score final de ce screenshot.", images: [data] },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama request failed: ${res.status} ${res.statusText} — ${await res.text()}`);
  }

  const body = (await res.json()) as OllamaChatResponse;
  const raw = body.message?.content ?? "{}";
  return { ...parseScoreJson(raw), raw: body };
}
