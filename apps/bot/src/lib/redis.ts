import Redis from "ioredis";
import { env } from "../env.js";

/** ioredis requires separate connections for pub vs sub vs regular commands. */
export const redisPub = new Redis(env.REDIS_URL);
export const redisSub = new Redis(env.REDIS_URL);
