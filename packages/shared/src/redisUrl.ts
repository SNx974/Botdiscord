/**
 * Plain connection options (rather than an ioredis instance) so BullMQ can
 * build its own client internally. Passing a ready-made ioredis instance
 * across package boundaries breaks when the root and a workspace each hoist
 * a different ioredis copy, since BullMQ bundles its own typings for it.
 */
export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
}

export function parseRedisUrl(redisUrl: string): RedisConnectionOptions {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname && url.pathname !== "/" ? Number(url.pathname.slice(1)) : undefined,
  };
}
