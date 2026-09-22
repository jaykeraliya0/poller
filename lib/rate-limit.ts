import "server-only";
import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import { AppError, ErrorCode } from "@/lib/errors";
import { getRedis } from "@/lib/redis";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Limits from the design doc. `subject` is the IP, user id, or `pollId:ip`. */
export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * MINUTE },
  register: { limit: 5, windowMs: HOUR },
  create: { limit: 10, windowMs: HOUR },
  vote: { limit: 30, windowMs: MINUTE },
  "vote-poll": { limit: 5, windowMs: MINUTE },
} as const;

export type RateLimitScope = keyof typeof RATE_LIMITS;

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfter: number };

export function rateLimitKey(scope: RateLimitScope, subject: string): string {
  return `rl:${scope}:${subject}`;
}

/**
 * Sliding-window limiter: each key is a sorted set of request timestamps.
 * Every request is recorded, so a client that keeps hammering stays limited.
 * Fails open (allows) if Redis is unavailable.
 */
export async function checkRateLimit(
  scope: RateLimitScope,
  subject: string,
  redis: Redis = getRedis(),
  now: number = Date.now(),
): Promise<RateLimitResult> {
  const { limit, windowMs } = RATE_LIMITS[scope];
  const key = rateLimitKey(scope, subject);

  try {
    const results = await redis
      .multi()
      .zremrangebyscore(key, 0, now - windowMs)
      .zcard(key)
      .zadd(key, now, `${now}-${randomUUID()}`)
      .zrange(key, "0", "0", "WITHSCORES")
      .pexpire(key, windowMs)
      .exec();

    if (!results) throw new Error("rate limit transaction aborted");
    const failed = results.find(([error]) => error);
    if (failed) throw failed[0];

    const countBefore = Number(results[1][1]);
    if (countBefore < limit) return { allowed: true };

    const [, oldestScore] = results[3][1] as string[];
    const retryAfterMs = Number(oldestScore) + windowMs - now;
    return { allowed: false, retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  } catch (error) {
    console.warn(`[rate-limit] failing open for ${key}:`, (error as Error).message);
    return { allowed: true };
  }
}

/** Throws RATE_LIMITED when over the limit; for use at the top of actions. */
export async function enforceRateLimit(scope: RateLimitScope, subject: string): Promise<void> {
  const result = await checkRateLimit(scope, subject);
  if (!result.allowed) {
    throw new AppError(
      ErrorCode.RATE_LIMITED,
      `Too many attempts. Try again in ${result.retryAfter}s.`,
      { retryAfter: result.retryAfter },
    );
  }
}
