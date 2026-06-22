import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __redisPub: Redis | undefined;
}

export const redisPub = global.__redisPub ?? new Redis(process.env.REDIS_URL!);

if (process.env.NODE_ENV !== "production") {
  global.__redisPub = redisPub;
}
