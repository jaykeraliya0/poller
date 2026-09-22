import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { castVote, withdrawVote, type VoterIdentity } from "@/lib/poll/votes";
import { createAvailabilityPoll, createChoicePoll, createUser, resetDatabase } from "@/tests/setup/db";

const guest = (voterToken = crypto.randomUUID()): VoterIdentity => ({ userId: null, userName: null, voterToken });
const member = (user: { id: string; name: string }, voterToken = crypto.randomUUID()): VoterIdentity => ({
  userId: user.id,
  userName: user.name,
  voterToken,
});

const PAST = new Date(Date.now() - 60_000);

describe("castVote", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let poll: Awaited<ReturnType<typeof createChoicePoll>>;
  const vote = (optionIndex: number, extra: Record<string, unknown> = {}) => ({
    slug: poll.slug,
    answers: { optionIds: [poll.options[optionIndex].id] },
    voterName: "Ana",
    ...extra,
  });

  beforeEach(async () => {
    await resetDatabase();
    owner = await createUser("Owner");
    poll = await createChoicePoll(owner.id);
  });

  it("records a guest vote with its answers", async () => {
    const result = await castVote(vote(1, { comment: "  Love it  " }), guest("t1"));
    expect(result).toMatchObject({ updated: false, voterToken: "t1" });

    const response = await db.pollResponse.findFirstOrThrow({ include: { answers: true } });
    expect(response).toMatchObject({ voterToken: "t1", voterName: "Ana", comment: "Love it", userId: null });
    expect(response.answers).toEqual([expect.objectContaining({ optionId: poll.options[1].id, value: 1 })]);
  });

  it("requires a name on named polls but never stores one on anonymous polls", async () => {
    await expect(castVote(vote(0, { voterName: " " }), guest())).rejects.toMatchObject({
      code: "VALIDATION",
      fieldErrors: { voterName: [expect.any(String)] },
    });

    const anonymous = await createChoicePoll(owner.id, ["A", "B"], { isAnonymous: true });
    const user = await createUser("Named Person");
    await castVote(
      { slug: anonymous.slug, answers: { optionIds: [anonymous.options[0].id] }, voterName: "Leak" },
      member(user),
    );
    expect(await db.pollResponse.findFirstOrThrow({ where: { pollId: anonymous.id } })).toMatchObject({
      voterName: null,
      userId: user.id,
    });
  });

  it("uses the account name when a signed-in voter leaves the name blank", async () => {
    const user = await createUser("Ben");
    await castVote(vote(0, { voterName: "" }), member(user));
    expect(await db.pollResponse.findFirstOrThrow()).toMatchObject({ voterName: "Ben" });
  });

  it("rejects votes once the poll closed, even if the form was opened earlier", async () => {
    await db.poll.update({ where: { id: poll.id }, data: { closesAt: PAST } });
    await expect(castVote(vote(0), guest())).rejects.toMatchObject({ code: "POLL_CLOSED" });

    await db.poll.update({ where: { id: poll.id }, data: { closesAt: null, closedAt: PAST } });
    await expect(castVote(vote(0), guest())).rejects.toMatchObject({ code: "POLL_CLOSED" });
    expect(await db.pollResponse.count()).toBe(0);
  });

  it("enforces require_login", async () => {
    await db.poll.update({ where: { id: poll.id }, data: { requireLogin: true } });
    await expect(castVote(vote(0), guest())).rejects.toMatchObject({ code: "LOGIN_REQUIRED" });
    await expect(castVote(vote(0), member(await createUser()))).resolves.toMatchObject({ updated: false });
  });

  it("lets the owner vote like anyone else", async () => {
    await castVote(vote(2), member(owner));
    expect(await db.pollResponse.count({ where: { userId: owner.id } })).toBe(1);
  });

  it("replaces answers when changing a vote", async () => {
    const identity = guest();
    await castVote(vote(0), identity);
    const result = await castVote(vote(2, { comment: "Changed my mind" }), identity);

    expect(result.updated).toBe(true);
    const responses = await db.pollResponse.findMany({ include: { answers: true } });
    expect(responses).toHaveLength(1);
    expect(responses[0].comment).toBe("Changed my mind");
    expect(responses[0].answers.map((a) => a.optionId)).toEqual([poll.options[2].id]);
  });

  it("reports ALREADY_VOTED when vote changes are off", async () => {
    await db.poll.update({ where: { id: poll.id }, data: { allowVoteChange: false } });
    const identity = guest();
    await castVote(vote(0), identity);
    await expect(castVote(vote(1), identity)).rejects.toMatchObject({ code: "ALREADY_VOTED" });
  });

  it("survives a double submit: one response, no error for the loser", async () => {
    const identity = guest();
    const results = await Promise.all([castVote(vote(0), identity), castVote(vote(1), identity)]);
    expect(results.map((r) => r.updated).sort()).toEqual([false, true]);
    expect(await db.pollResponse.count()).toBe(1);
    expect(await db.answer.count()).toBe(1);
  });

  it("turns the losing concurrent submit into ALREADY_VOTED when changes are off", async () => {
    await db.poll.update({ where: { id: poll.id }, data: { allowVoteChange: false } });
    const identity = guest();
    const settled = await Promise.allSettled([castVote(vote(0), identity), castVote(vote(1), identity)]);
    expect(settled.filter((s) => s.status === "fulfilled")).toHaveLength(1);
    expect(settled.find((s) => s.status === "rejected")).toMatchObject({ reason: { code: "ALREADY_VOTED" } });
    expect(await db.pollResponse.count()).toBe(1);
  });

  it("links a guest vote to the account when the same browser signs in and votes again", async () => {
    const user = await createUser("Cy");
    await castVote(vote(0), guest("browser-1"));
    const result = await castVote(vote(1), member(user, "browser-1"));

    expect(result.updated).toBe(true);
    const responses = await db.pollResponse.findMany();
    expect(responses).toEqual([expect.objectContaining({ voterToken: "browser-1", userId: user.id })]);
  });

  it("gives a second account on a shared browser its own vote with a fresh token", async () => {
    const [first, second] = [await createUser("First"), await createUser("Second")];
    await castVote(vote(0), member(first, "shared"));
    const result = await castVote(vote(1), member(second, "shared"));

    expect(result).toMatchObject({ updated: false });
    expect(result.voterToken).not.toBe("shared");
    const responses = await db.pollResponse.findMany({ orderBy: { createdAt: "asc" } });
    expect(responses.map((r) => r.userId)).toEqual([first.id, second.id]);
  });

  it("rejects answers that reference another poll's options", async () => {
    const other = await createChoicePoll(owner.id);
    await expect(
      castVote({ slug: poll.slug, answers: { optionIds: [other.options[0].id] }, voterName: "X" }, guest()),
    ).rejects.toMatchObject({ code: "VALIDATION", fieldErrors: { "answers.optionIds.0": [expect.any(String)] } });
  });

  it("enforces max selections on multi-choice polls", async () => {
    const multi = await createChoicePoll(owner.id, ["A", "B", "C"], { config: { multi: true, maxSelections: 2 } });
    const input = { slug: multi.slug, answers: { optionIds: multi.options.map((o) => o.id) }, voterName: "X" };
    await expect(castVote(input, guest())).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("returns NOT_FOUND for unknown or malformed slugs", async () => {
    for (const slug of ["zzzzzzzzzz", "not a slug", ""]) {
      await expect(castVote({ ...vote(0), slug }, guest())).rejects.toMatchObject({
        code: slug ? "NOT_FOUND" : "VALIDATION",
      });
    }
  });
});

describe("availability votes", () => {
  beforeEach(resetDatabase);

  it("stores yes / if need be / no per slot and requires every slot", async () => {
    const owner = await createUser();
    const poll = await createAvailabilityPoll(owner.id, 3);
    const [a, b, c] = poll.options.map((o) => o.id);

    await expect(
      castVote({ slug: poll.slug, answers: { availability: { [a]: 2, [b]: 1 } }, voterName: "X" }, guest()),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      castVote({ slug: poll.slug, answers: { availability: { [a]: 2, [b]: 1, [c]: 5 } }, voterName: "X" }, guest()),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    await castVote({ slug: poll.slug, answers: { availability: { [a]: 2, [b]: 1, [c]: 0 } }, voterName: "X" }, guest());
    const answers = await db.answer.findMany();
    expect(Object.fromEntries(answers.map((row) => [row.optionId, row.value]))).toEqual({ [a]: 2, [b]: 1, [c]: 0 });
  });
});

describe("withdrawVote", () => {
  let poll: Awaited<ReturnType<typeof createChoicePoll>>;

  beforeEach(async () => {
    await resetDatabase();
    poll = await createChoicePoll((await createUser()).id);
  });

  const voteAs = (identity: VoterIdentity) =>
    castVote({ slug: poll.slug, answers: { optionIds: [poll.options[0].id] }, voterName: "X" }, identity);

  it("deletes the viewer's response and its answers", async () => {
    const identity = guest();
    await voteAs(identity);
    await withdrawVote(poll.slug, identity);
    expect(await db.pollResponse.count()).toBe(0);
    expect(await db.answer.count()).toBe(0);
  });

  it("refuses when there's no vote, changes are off, or the poll closed", async () => {
    await expect(withdrawVote(poll.slug, guest())).rejects.toMatchObject({ code: "NOT_FOUND" });

    const identity = guest();
    await voteAs(identity);
    await db.poll.update({ where: { id: poll.id }, data: { allowVoteChange: false } });
    await expect(withdrawVote(poll.slug, identity)).rejects.toMatchObject({ code: "VOTE_CHANGE_DISABLED" });

    await db.poll.update({ where: { id: poll.id }, data: { allowVoteChange: true, closedAt: PAST } });
    await expect(withdrawVote(poll.slug, identity)).rejects.toMatchObject({ code: "POLL_CLOSED" });
    expect(await db.pollResponse.count()).toBe(1);
  });

  it("can't remove someone else's vote", async () => {
    await voteAs(guest("theirs"));
    await expect(withdrawVote(poll.slug, guest("mine"))).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await db.pollResponse.count()).toBe(1);
  });
});
