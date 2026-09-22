import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireOwner, requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { createChoicePoll, createUser, resetDatabase } from "@/tests/setup/db";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth }));

const signInAs = (userId: string | null) =>
  auth.mockResolvedValue(userId ? { user: { id: userId, name: "Test" } } : null);

describe("auth guards", () => {
  beforeEach(async () => {
    await resetDatabase();
    auth.mockReset();
  });

  it("requireUser throws UNAUTHENTICATED without a session", async () => {
    signInAs(null);
    await expect(requireUser()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("requireUser rejects a still-valid JWT for a deleted account", async () => {
    const user = await createUser();
    signInAs(user.id);
    await expect(requireUser()).resolves.toMatchObject({ id: user.id });

    await db.user.delete({ where: { id: user.id } });
    await expect(requireUser()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("requireOwner returns the owner's poll", async () => {
    const owner = await createUser();
    const poll = await createChoicePoll(owner.id);
    signInAs(owner.id);
    await expect(requireOwner(poll.id)).resolves.toMatchObject({ poll: { id: poll.id } });
  });

  it("requireOwner hides other people's polls, missing polls and malformed ids alike", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const poll = await createChoicePoll(owner.id);
    signInAs(intruder.id);

    for (const id of [poll.id, crypto.randomUUID(), "not-a-uuid"]) {
      await expect(requireOwner(id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
  });
});
