import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitVoteAction } from "@/actions/votes";
import { db } from "@/lib/db";
import { VOTER_TOKEN_COOKIE } from "@/lib/voter-token";
import { createChoicePoll, createUser, resetDatabase } from "@/tests/setup/db";

const { auth, cookieJar, requestHeaders } = vi.hoisted(() => ({
  auth: vi.fn(),
  cookieJar: new Map<string, string>(),
  requestHeaders: new Map<string, string>(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined),
    set: (name: string, value: string) => void cookieJar.set(name, value),
  }),
  headers: async () => ({ get: (name: string) => requestHeaders.get(name) ?? null }),
}));

describe("submitVoteAction", () => {
  let poll: Awaited<ReturnType<typeof createChoicePoll>>;
  const input = () => ({ slug: poll.slug, answers: { optionIds: [poll.options[0].id] }, voterName: "Ana" });

  beforeEach(async () => {
    await resetDatabase();
    cookieJar.clear();
    requestHeaders.set("x-forwarded-for", `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`);
    auth.mockResolvedValue(null);
    poll = await createChoicePoll((await createUser()).id);
  });

  it("issues a voter token when the browser has none and records the vote under it", async () => {
    expect(await submitVoteAction(input())).toEqual({ ok: true, data: { updated: false, resultsVisible: true } });
    const token = cookieJar.get(VOTER_TOKEN_COOKIE);
    expect(token).toBeTruthy();
    expect(await db.pollResponse.findFirstOrThrow()).toMatchObject({ voterToken: token });
  });

  it("returns errors as values instead of throwing", async () => {
    await db.poll.update({ where: { id: poll.id }, data: { closedAt: new Date(Date.now() - 1000) } });
    expect(await submitVoteAction(input())).toMatchObject({ ok: false, code: "POLL_CLOSED" });
    expect(await submitVoteAction("garbage")).toMatchObject({ ok: false, code: "VALIDATION" });
  });

  it("rate limits repeated submissions to one poll from one IP", async () => {
    for (let i = 0; i < 5; i++) {
      cookieJar.clear(); // a fresh browser each time, so these are all new votes
      expect(await submitVoteAction(input())).toMatchObject({ ok: true });
    }
    expect(await submitVoteAction(input())).toMatchObject({ ok: false, code: "RATE_LIMITED" });
    expect(await db.pollResponse.count()).toBe(5);
  });
});
