import "dotenv/config";
import { z } from "zod";

const schema = z
  .object({
    DISCORD_BOT_TOKEN: z.string().min(1),
    DISCORD_GUILD_ID: z.string().min(1),
    DISCORD_MATCH_CATEGORY_ID: z.string().min(1),
    DISCORD_ADMIN_ROLE_ID: z.string().min(1),
    REDIS_URL: z.string().min(1),
    INTERNAL_API_SECRET: z.string().min(1),
    BOT_HTTP_PORT: z.coerce.number().optional(),
    API_PORT: z.coerce.number().optional(),
  })
  .transform((env) => ({ ...env, BOT_HTTP_PORT: env.BOT_HTTP_PORT ?? env.API_PORT ?? 4001 }));

export const env = schema.parse(process.env);
