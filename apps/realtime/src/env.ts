import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  REDIS_URL: z.string().min(1),
  REALTIME_PORT: z.coerce.number().default(4002),
  NEXTAUTH_URL: z.string().min(1).default("http://localhost:3000"),
  INTERNAL_API_KEY: z.string().min(1),
});

export const env = schema.parse(process.env);
