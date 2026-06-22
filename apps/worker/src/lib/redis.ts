import Redis from "ioredis";
import { parseRedisUrl } from "@akd/shared";
import { env } from "../env.js";

export const redisPub = new Redis(env.REDIS_URL);

/** Plain options (not an ioredis instance) so BullMQ builds its own client internally. */
export const bullConnectionOptions = { ...parseRedisUrl(env.REDIS_URL), maxRetriesPerRequest: null as null };
