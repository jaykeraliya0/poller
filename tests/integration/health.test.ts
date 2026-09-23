import { describe, expect, it, vi } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { db } from "@/lib/db";
import { getRedis } from "@/lib/redis";

const read = async () => {
  const response = await health();
  return { response, body: await response.json() };
};

describe("health check", () => {
  it("reports ok when Postgres and Redis both answer", async () => {
    const { response, body } = await read();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({
      status: "ok",
      uptime: expect.any(Number),
      checks: { database: { ok: true }, redis: { ok: true } },
    });
  });

  it("stays up but reports degraded when only Redis is unreachable", async () => {
    vi.spyOn(getRedis(), "ping").mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    const { response, body } = await read();
    // Rate limiting fails open, so a restart wouldn't help: keep serving.
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "degraded", checks: { redis: { ok: false, error: expect.any(String) } } });
    vi.restoreAllMocks();
  });

  it("returns 503 when Postgres is unreachable", async () => {
    vi.spyOn(db, "$queryRaw").mockRejectedValueOnce(new Error("terminating connection"));
    const { response, body } = await read();
    expect(response.status).toBe(503);
    expect(body).toMatchObject({ status: "unhealthy", checks: { database: { ok: false } } });
    vi.restoreAllMocks();
  });
});
