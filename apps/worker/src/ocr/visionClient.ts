import { ImageAnnotatorClient } from "@google-cloud/vision";

let client: ImageAnnotatorClient | null = null;

// Lazy so a deployment using OCR_PROVIDER=gpt4o never needs GCP credentials.
function getClient() {
  if (!client) client = new ImageAnnotatorClient();
  return client;
}

/**
 * Runs Google Cloud Vision text detection on a remote screenshot and returns
 * the raw recognized text plus the full API response (kept for audit/debug
 * in case a result is later disputed).
 */
export async function detectText(imageUrl: string): Promise<{ text: string; raw: unknown }> {
  const [result] = await getClient().textDetection(imageUrl);
  const text = result.fullTextAnnotation?.text ?? "";
  return { text, raw: result };
}
