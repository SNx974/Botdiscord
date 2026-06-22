import { ImageAnnotatorClient } from "@google-cloud/vision";

const client = new ImageAnnotatorClient();

/**
 * Runs Google Cloud Vision text detection on a remote screenshot and returns
 * the raw recognized text plus the full API response (kept for audit/debug
 * in case a result is later disputed).
 */
export async function detectText(imageUrl: string): Promise<{ text: string; raw: unknown }> {
  const [result] = await client.textDetection(imageUrl);
  const text = result.fullTextAnnotation?.text ?? "";
  return { text, raw: result };
}
