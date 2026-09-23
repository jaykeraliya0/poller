import { db } from "@/lib/db";
import { getRedis } from "@/lib/redis";

type Check = { ok: boolean; error?: string };

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function check(probe: () => Promise<unknown>): Promise<Check> {
  try {
    await probe();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

/**
 * Liveness and readiness for load balancers and uptime checks.
 *
 * Postgres decides the status: without it nothing works, so a failure is a 503
 * and the instance should be taken out of rotation. Redis only backs rate
 * limiting, which fails open, so an unreachable Redis is reported as degraded
 * but still 200 — restarting the app wouldn't fix it and would only lose capacity.
 */
export async function GET() {
  const [database, redis] = await Promise.all([
    check(() => db.$queryRaw`SELECT 1`),
    check(() => getRedis().ping()),
  ]);

  const status = database.ok ? (redis.ok ? "ok" : "degraded") : "unhealthy";
  return Response.json(
    { status, uptime: Math.round(process.uptime()), checks: { database, redis } },
    { status: database.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
