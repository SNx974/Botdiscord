import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  REDIS_URL: z.string().min(1),
  OCR_PROVIDER: z.enum(["gpt4o", "gemini", "vision"]).default("vision"),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
});

export const env = schema.parse(process.env);
