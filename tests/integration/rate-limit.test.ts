import Redis from "ioredis";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { RATE_LIMITS, checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", { db: 15 });
const usedKeys: string[] = [];

function subject() {
  const value = `test-${crypto.randomUUID()}`;
  usedKeys.push(rateLimitKey("vote-poll", value), rateLimitKey("login", value));
  return value;
}

afterEach(async () => {
  if (usedKeys.length) await redis.del(...usedKeys.splice(0));
  vi.restoreAllMocks();
});
afterAll(() => redis.quit());

describe("checkRateLimit (sliding window)", () => {
  const { limit, windowMs } = RATE_LIMITS["vote-poll"];

  it("allows up to the limit, then rejects with retryAfter", async () => {
    const who = subject();
    const now = 1_000_000;
    for (let i = 0; i < limit; i++) {
      expect(await checkRateLimit("vote-poll", who, redis, now + i)).toEqual({ allowed: true });
    }
    const blocked = await checkRateLimit("vote-poll", who, redis, now + limit);
    expect(blocked).toEqual({ allowed: false, retryAfter: Math.ceil(windowMs / 1000) });
  });

  it("frees capacity as old requests leave the window", async () => {
    const who = subject();
    const start = 2_000_000;
    for (let i = 0; i < limit; i++) await checkRateLimit("vote-poll", who, redis, start);
    expect((await checkRateLimit("vote-poll", who, redis, start + 1)).allowed).toBe(false);

    // Just past the window, the burst and the rejected hit have both expired.
    const later = await checkRateLimit("vote-poll", who, redis, start + windowMs + 1);
    expect(later.allowed).toBe(true);
  });

  it("tracks subjects independently and sets a TTL on the key", async () => {
    const [a, b] = [subject(), subject()];
    for (let i = 0; i < limit; i++) await checkRateLimit("vote-poll", a, redis);
    expect((await checkRateLimit("vote-poll", a, redis)).allowed).toBe(false);
    expect((await checkRateLimit("vote-poll", b, redis)).allowed).toBe(true);

    const ttl = await redis.pttl(rateLimitKey("vote-poll", a));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(windowMs);
  });

  it("fails open with a warning when Redis is unreachable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken = new Redis("redis://localhost:1", {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
    broken.on("error", () => {});

    expect(await checkRateLimit("login", subject(), broken)).toEqual({ allowed: true });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("failing open"), expect.any(String));
    broken.disconnect();
  });
});
