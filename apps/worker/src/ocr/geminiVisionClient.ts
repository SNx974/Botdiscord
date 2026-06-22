import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../env.js";
import { SCORE_SYSTEM_PROMPT, parseScoreJson, type VisionScoreResult } from "./scoreSchema.js";

let client: GoogleGenerativeAI | null = null;

function getClient() {
  if (!client) client = new GoogleGenerativeAI(env.GEMINI_API_KEY!);
  return client;
}

async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to download screenshot: ${res.status} ${res.statusText}`);
  const mimeType = res.headers.get("content-type") ?? "image/png";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { data: buffer.toString("base64"), mimeType };
}

/**
 * Gemini's API needs the image bytes inline (no generic image-by-URL input
 * like OpenAI's), so we fetch the screenshot ourselves before sending it.
 */
export async function scanScoreWithGemini(imageUrl: string): Promise<VisionScoreResult> {
  const model = getClient().getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const { data, mimeType } = await fetchImageAsBase64(imageUrl);

  const result = await model.generateContent([
    `${SCORE_SYSTEM_PROMPT}\n\nExtrait le score final de ce screenshot.`,
    { inlineData: { data, mimeType } },
  ]);

  const raw = result.response.text();
  return { ...parseScoreJson(raw), raw: result.response };
}
