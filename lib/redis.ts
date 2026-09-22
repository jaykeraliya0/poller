import "server-only";
import Redis from "ioredis";

/**
 * Redis is only used for rate limiting and must never take the app down, so
 * commands time out quickly and callers treat any error as "allow".
 */
function createClient() {
  const client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    connectTimeout: 1_000,
    commandTimeout: 500,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt) => Math.min(attempt * 200, 5_000),
  });
  client.on("error", (error) => {
    console.warn(`[redis] ${error.message}`);
  });
  return client;
}

const globalForRedis = globalThis as unknown as { redis?: Redis };

export function getRedis(): Redis {
  globalForRedis.redis ??= createClient();
  return globalForRedis.redis;
}
