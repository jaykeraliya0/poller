import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createChoicePoll, createUser, resetDatabase } from "@/tests/setup/db";

/** Guards the data-model rules the app relies on for correctness under races. */
describe("database constraints", () => {
  beforeEach(resetDatabase);

  it("treats emails case-insensitively", async () => {
    await db.user.create({ data: { email: "Ana@Example.com", name: "Ana", passwordHash: "x" } });
    await expect(
      db.user.create({ data: { email: "ana@example.com", name: "Ana 2", passwordHash: "x" } }),
    ).rejects.toMatchObject({ code: "P2002" });
    expect(await db.user.findUnique({ where: { email: "ANA@EXAMPLE.COM" } })).not.toBeNull();
  });

  it("allows only one response per voter token per poll", async () => {
    const owner = await createUser();
    const poll = await createChoicePoll(owner.id);
    await db.pollResponse.create({ data: { pollId: poll.id, voterToken: "tok" } });
    await expect(
      db.pollResponse.create({ data: { pollId: poll.id, voterToken: "tok" } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("allows only one response per signed-in user, but any number of guests", async () => {
    const owner = await createUser();
    const voter = await createUser();
    const poll = await createChoicePoll(owner.id);

    await db.pollResponse.createMany({
      data: [
        { pollId: poll.id, voterToken: "guest-1" },
        { pollId: poll.id, voterToken: "guest-2" },
        { pollId: poll.id, voterToken: "member-1", userId: voter.id },
      ],
    });
    await expect(
      db.pollResponse.create({ data: { pollId: poll.id, voterToken: "member-2", userId: voter.id } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("stores at most one answer per option per response", async () => {
    const owner = await createUser();
    const poll = await createChoicePoll(owner.id);
    const response = await db.pollResponse.create({ data: { pollId: poll.id, voterToken: "t" } });
    const optionId = poll.options[0].id;

    await db.answer.create({ data: { responseId: response.id, optionId, value: 1 } });
    await expect(
      db.answer.create({ data: { responseId: response.id, optionId, value: 1 } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("rejects invalid rows via check constraints", async () => {
    const owner = await createUser();
    const poll = await createChoicePoll(owner.id);
    await expect(
      db.pollOption.create({ data: { pollId: poll.id, label: "x", position: -1 } }),
    ).rejects.toThrow();
    await expect(
      db.poll.update({ where: { id: poll.id }, data: { expectedParticipants: 0 } }),
    ).rejects.toThrow();
    await expect(
      db.pollOption.create({
        data: {
          pollId: poll.id,
          label: "backwards",
          position: 9,
          startsAt: new Date("2026-10-01T10:00:00Z"),
          endsAt: new Date("2026-10-01T09:00:00Z"),
        },
      }),
    ).rejects.toThrow();
  });

  it("deleting an account removes their polls but keeps their votes elsewhere, unlinked", async () => {
    const leaving = await createUser("Leaving");
    const other = await createUser("Other");
    const ownPoll = await createChoicePoll(leaving.id);
    const otherPoll = await createChoicePoll(other.id);

    // Someone else voted on the leaving user's poll; the leaving user voted on another poll.
    const theirVote = await db.pollResponse.create({
      data: {
        pollId: ownPoll.id,
        voterToken: "v1",
        userId: other.id,
        answers: { create: { optionId: ownPoll.options[0].id, value: 1 } },
      },
    });
    const ownVote = await db.pollResponse.create({
      data: { pollId: otherPoll.id, voterToken: "v2", userId: leaving.id },
    });

    await db.user.delete({ where: { id: leaving.id } });

    expect(await db.poll.findUnique({ where: { id: ownPoll.id } })).toBeNull();
    expect(await db.pollResponse.findUnique({ where: { id: theirVote.id } })).toBeNull();
    expect(await db.answer.count()).toBe(0);
    expect(await db.pollResponse.findUnique({ where: { id: ownVote.id } })).toMatchObject({
      userId: null,
    });
  });
});
