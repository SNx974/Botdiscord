import OpenAI from "openai";
import { env } from "../env.js";
import { SCORE_SYSTEM_PROMPT, parseScoreJson, type VisionScoreResult } from "./scoreSchema.js";

let client: OpenAI | null = null;

function getClient() {
  if (!client) client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

/**
 * Asks GPT-4o to read the score directly off the screenshot instead of
 * running raw OCR + regex — more robust across wildly different game UIs.
 */
export async function scanScoreWithGpt4o(imageUrl: string): Promise<VisionScoreResult> {
  const completion = await getClient().chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SCORE_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Extrait le score final de ce screenshot." },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  return { ...parseScoreJson(raw), raw: completion };
}
