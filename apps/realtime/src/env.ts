import "dotenv/config";
import { z } from "zod";

const schema = z
  .object({
    REDIS_URL: z.string().min(1),
    REALTIME_PORT: z.coerce.number().optional(),
    API_PORT: z.coerce.number().optional(),
    NEXTAUTH_URL: z.string().min(1).default("http://localhost:3000"),
    INTERNAL_API_SECRET: z.string().min(1),
  })
  .transform((env) => ({ ...env, REALTIME_PORT: env.REALTIME_PORT ?? env.API_PORT ?? 4002 }));

export const env = schema.parse(process.env);
