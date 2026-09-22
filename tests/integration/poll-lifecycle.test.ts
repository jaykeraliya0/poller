import { beforeEach, describe, expect, it, vi } from "vitest";
import { closePollAction, reopenPollAction } from "@/actions/polls";
import { db } from "@/lib/db";
import { loadPollResults } from "@/lib/poll/results";
import { castVote } from "@/lib/poll/votes";
import { createChoicePoll, createUser, resetDatabase } from "@/tests/setup/db";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const signInAs = (id: string) => auth.mockResolvedValue({ user: { id, name: "Someone" } });
const HOUR = 3_600_000;

describe("closing and reopening a poll", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let poll: Awaited<ReturnType<typeof createChoicePoll>>;

  beforeEach(async () => {
    await resetDatabase();
    owner = await createUser("Owner");
    poll = await createChoicePoll(owner.id);
    signInAs(owner.id);
  });

  it("closes an open poll and then refuses to close it again", async () => {
    expect(await closePollAction(poll.id)).toEqual({ ok: true, data: undefined });
    expect((await db.poll.findUniqueOrThrow({ where: { id: poll.id } })).closedAt).toBeInstanceOf(Date);
    expect(await closePollAction(poll.id)).toMatchObject({ ok: false, code: "ALREADY_CLOSED" });
  });

  it("treats a passed deadline as already closed", async () => {
    await db.poll.update({ where: { id: poll.id }, data: { closesAt: new Date(Date.now() - HOUR) } });
    expect(await closePollAction(poll.id)).toMatchObject({ code: "ALREADY_CLOSED" });
  });

  it("hides other people's polls behind NOT_FOUND", async () => {
    signInAs((await createUser("Intruder")).id);
    expect(await closePollAction(poll.id)).toMatchObject({ code: "NOT_FOUND" });
    expect(await reopenPollAction(poll.id)).toMatchObject({ code: "NOT_FOUND" });
    expect((await db.poll.findUniqueOrThrow({ where: { id: poll.id } })).closedAt).toBeNull();
  });

  it("reopens a manually closed poll and keeps its future deadline", async () => {
    const deadline = new Date(Date.now() + 5 * HOUR);
    await db.poll.update({ where: { id: poll.id }, data: { closesAt: deadline } });
    await closePollAction(poll.id);
    expect(await reopenPollAction(poll.id)).toMatchObject({ ok: true });
    expect(await db.poll.findUniqueOrThrow({ where: { id: poll.id } })).toMatchObject({ closedAt: null, closesAt: deadline });
    expect(await reopenPollAction(poll.id)).toMatchObject({ code: "CONFLICT", message: "This poll is already open." });
  });

  it("needs a new deadline, or none, to reopen once the deadline has passed", async () => {
    await db.poll.update({ where: { id: poll.id }, data: { closesAt: new Date(Date.now() - HOUR) } });
    expect(await reopenPollAction(poll.id)).toMatchObject({ code: "CONFLICT", message: expect.stringMatching(/deadline/) });
    expect(
      await reopenPollAction(poll.id, { closesAt: new Date(Date.now() - 2 * HOUR).toISOString() }),
    ).toMatchObject({ code: "VALIDATION", fieldErrors: { closesAt: ["Deadline must be in the future"] } });

    const future = new Date(Math.floor((Date.now() + 24 * HOUR) / 1000) * 1000);
    expect(await reopenPollAction(poll.id, { closesAt: future.toISOString() })).toMatchObject({ ok: true });
    expect(await db.poll.findUniqueOrThrow({ where: { id: poll.id } })).toMatchObject({ closedAt: null, closesAt: future });

    // Closed by hand after the deadline passed: reopening with no deadline clears it.
    await db.poll.update({
      where: { id: poll.id },
      data: { closedAt: new Date(Date.now() - 2 * HOUR), closesAt: new Date(Date.now() - HOUR) },
    });
    expect(await reopenPollAction(poll.id, { closesAt: null })).toMatchObject({ ok: true });
    expect(await db.poll.findUniqueOrThrow({ where: { id: poll.id } })).toMatchObject({ closedAt: null, closesAt: null });
  });
});

describe("loadPollResults", () => {
  beforeEach(resetDatabase);

  it("computes insights and per-voter rows from the database", async () => {
    const owner = await createUser();
    const poll = await createChoicePoll(owner.id, ["Pizza", "Sushi", "Tacos"], { expectedParticipants: 4 });
    const vote = (index: number, name: string, comment?: string) =>
      castVote(
        { slug: poll.slug, answers: { optionIds: [poll.options[index].id] }, voterName: name, comment },
        { userId: null, userName: null, userEmail: null, userEmailVerified: false, voterToken: crypto.randomUUID() },
      );
    await vote(1, "Ana", "Sushi please");
    await vote(1, "Ben");
    await vote(0, "Cy");

    const withOptions = await db.poll.findUniqueOrThrow({ where: { id: poll.id }, include: { options: { orderBy: { position: "asc" } } } });
    const { insights, rows } = await loadPollResults(withOptions);

    expect(insights.common).toMatchObject({ totalResponses: 3, responseRate: { percent: 75 }, hasEnoughData: true });
    expect(insights.byType.headline).toBe("Sushi leads with 2 of 3 votes (67%), 1 ahead of Pizza");
    expect(insights.common.comments).toEqual([expect.objectContaining({ author: "Ana", text: "Sushi please" })]);
    expect(rows.map((row) => [row.voterName, row.summary])).toEqual([
      ["Cy", "Pizza"],
      ["Ben", "Sushi"],
      ["Ana", "Sushi"],
    ]);
  });
});

describe("post-vote results visibility", () => {
  beforeEach(resetDatabase);

  it.each([
    ["PUBLIC", true],
    ["AFTER_VOTE", true],
    ["AFTER_CLOSE", false],
    ["OWNER_ONLY", false],
  ] as const)("%s → voter can see results: %s", async (resultsVisibility, expected) => {
    const poll = await createChoicePoll((await createUser()).id, ["A", "B"], { resultsVisibility });
    const result = await castVote(
      { slug: poll.slug, answers: { optionIds: [poll.options[0].id] }, voterName: "X" },
      { userId: null, userName: null, userEmail: null, userEmailVerified: false, voterToken: crypto.randomUUID() },
    );
    expect(result.resultsVisible).toBe(expected);
  });
});
