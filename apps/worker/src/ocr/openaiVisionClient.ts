import OpenAI from "openai";
import { env } from "../env.js";

let client: OpenAI | null = null;

function getClient() {
  if (!client) client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

export interface Gpt4oScoreResult {
  scoreA: number | null;
  scoreB: number | null;
  confidence: "high" | "low" | "unparsed";
  raw: unknown;
}

const SYSTEM_PROMPT =
  'Tu analyses un screenshot de fin de partie e-sport. Réponds uniquement en JSON strict: ' +
  '{"scoreA": number|null, "scoreB": number|null, "confidence": "high"|"low"|"unparsed"}. ' +
  "scoreA est le score de l'équipe affichée en premier/à gauche, scoreB celui de l'équipe à droite. " +
  'Mets confidence à "high" si le score est affiché sans ambiguïté, "low" si tu dois deviner, ' +
  '"unparsed" (avec scoreA/scoreB à null) si aucun score n\'est lisible.';

/**
 * Asks GPT-4o to read the score directly off the screenshot instead of
 * running raw OCR + regex — more robust across wildly different game UIs.
 */
export async function scanScoreWithGpt4o(imageUrl: string): Promise<Gpt4oScoreResult> {
  const completion = await getClient().chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
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

  try {
    const parsed = JSON.parse(raw);
    const confidence =
      parsed.confidence === "high" || parsed.confidence === "low" || parsed.confidence === "unparsed"
        ? parsed.confidence
        : "unparsed";
    return {
      scoreA: typeof parsed.scoreA === "number" ? parsed.scoreA : null,
      scoreB: typeof parsed.scoreB === "number" ? parsed.scoreB : null,
      confidence,
      raw: completion,
    };
  } catch {
    return { scoreA: null, scoreB: null, confidence: "unparsed", raw: completion };
  }
}
