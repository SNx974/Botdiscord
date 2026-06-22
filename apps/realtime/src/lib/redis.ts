import Redis from "ioredis";
import { env } from "../env.js";

export const redisPub = new Redis(env.REDIS_URL);
export const redisSub = new Redis(env.REDIS_URL);
