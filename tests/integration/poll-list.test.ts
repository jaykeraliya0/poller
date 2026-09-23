import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createGroup } from "@/lib/groups/service";
import { POLLS_PER_PAGE } from "@/lib/poll/list-params";
import { listPollsForOwner, listPollsVotedOn } from "@/lib/poll/service";
import { castVote, type VoterIdentity } from "@/lib/poll/votes";
import { createChoicePoll, createUser, resetDatabase } from "@/tests/setup/db";

const listParams = { scope: "mine", filter: "all", q: "", page: 1 } as const;

const HOUR = 3_600_000;
const now = new Date();
const at = (offsetHours: number) => new Date(now.getTime() + offsetHours * HOUR);

describe("listing an owner's polls a page at a time", () => {
  let ownerId: string;

  beforeEach(async () => {
    await resetDatabase();
    ownerId = (await createUser("Owner")).id;
  });

  it("pages newest first and reports totals", async () => {
    const total = POLLS_PER_PAGE + 3;
    for (let index = 0; index < total; index++) {
      await createChoicePoll(ownerId, ["A", "B"], { title: `Poll ${index}`, createdAt: at(-index) });
    }
    await createChoicePoll((await createUser("Someone else")).id);

    const first = await listPollsForOwner(ownerId, { scope: "mine", filter: "all", q: "", page: 1 }, now);
    expect(first).toMatchObject({ total, page: 1, pageCount: 2, counts: { all: total, open: total, closed: 0 } });
    expect(first.polls.map((poll) => poll.title)).toEqual(
      Array.from({ length: POLLS_PER_PAGE }, (_, index) => `Poll ${index}`),
    );

    const second = await listPollsForOwner(ownerId, { scope: "mine", filter: "all", q: "", page: 2 }, now);
    expect(second.polls.map((poll) => poll.title)).toEqual(["Poll 10", "Poll 11", "Poll 12"]);
  });

  it("clamps a page past the end to the last page", async () => {
    await createChoicePoll(ownerId);
    const result = await listPollsForOwner(ownerId, { scope: "mine", filter: "all", q: "", page: 9 }, now);
    expect(result).toMatchObject({ page: 1, pageCount: 1, total: 1 });
    expect(result.polls).toHaveLength(1);
  });

  it("filters by status the same way getPollStatus does", async () => {
    await createChoicePoll(ownerId, ["A", "B"], { title: "No deadline" });
    await createChoicePoll(ownerId, ["A", "B"], { title: "Deadline ahead", closesAt: at(2) });
    await createChoicePoll(ownerId, ["A", "B"], { title: "Deadline passed", closesAt: at(-2) });
    await createChoicePoll(ownerId, ["A", "B"], { title: "Closed by hand", closedAt: at(-1) });

    const titles = async (filter: "open" | "closed") =>
      (await listPollsForOwner(ownerId, { scope: "mine", filter, q: "", page: 1 }, now)).polls.map((poll) => poll.title).sort();

    expect(await titles("open")).toEqual(["Deadline ahead", "No deadline"]);
    expect(await titles("closed")).toEqual(["Closed by hand", "Deadline passed"]);
    const { counts } = await listPollsForOwner(ownerId, { scope: "mine", filter: "open", q: "", page: 1 }, now);
    expect(counts).toEqual({ all: 4, open: 2, closed: 2, archived: 0 });
  });

  it("searches titles case-insensitively within the chosen status", async () => {
    await createChoicePoll(ownerId, ["A", "B"], { title: "Team lunch" });
    await createChoicePoll(ownerId, ["A", "B"], { title: "LUNCH vote", closedAt: at(-1) });
    await createChoicePoll(ownerId, ["A", "B"], { title: "Offsite dates" });

    const all = await listPollsForOwner(ownerId, { scope: "mine", filter: "all", q: "lunch", page: 1 }, now);
    expect(all.total).toBe(2);
    // Tab counts describe every poll, not just the search matches.
    expect(all.counts.all).toBe(3);

    const closed = await listPollsForOwner(ownerId, { scope: "mine", filter: "closed", q: "lunch", page: 1 }, now);
    expect(closed.polls.map((poll) => poll.title)).toEqual(["LUNCH vote"]);
  });
});

describe("listing the polls a user has voted on", () => {
  let me: Awaited<ReturnType<typeof createUser>>;
  let owner: Awaited<ReturnType<typeof createUser>>;

  const as = (user: { id: string; name: string; email: string }): VoterIdentity => ({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userEmailVerified: true,
    voterToken: crypto.randomUUID(),
  });

  const voteOn = (poll: Awaited<ReturnType<typeof createChoicePoll>>, optionIndex = 0) =>
    castVote({ slug: poll.slug, answers: { optionIds: [poll.options[optionIndex].id] } }, as(me));

  beforeEach(async () => {
    await resetDatabase();
    me = await createUser("Me");
    owner = await createUser("Owner");
  });

  it("lists only the polls this user voted on, including their own", async () => {
    const voted = await createChoicePoll(owner.id, ["A", "B"], { title: "Voted", createdAt: at(-1) });
    const mine = await createChoicePoll(me.id, ["A", "B"], { title: "Mine, voted", createdAt: at(-2) });
    await createChoicePoll(owner.id, ["A", "B"], { title: "Never voted" });
    // Someone else's vote on the same poll doesn't pull it in for us.
    const other = await createChoicePoll(owner.id, ["A", "B"], { title: "Someone else voted" });
    await castVote({ slug: other.slug, answers: { optionIds: [other.options[0].id] } }, as(owner));

    await voteOn(voted);
    await voteOn(mine);

    const result = await listPollsVotedOn(me, { ...listParams, scope: "voted" }, now);
    expect(result.total).toBe(2);
    expect(result.polls.map((poll) => poll.title)).toEqual(["Voted", "Mine, voted"]);
    expect(result.counts).toEqual({ all: 2, open: 2, closed: 0, archived: 0 });
  });

  it("carries the user's own answer and creator, and nobody else's", async () => {
    const poll = await createChoicePoll(owner.id, ["Pizza", "Sushi"]);
    await voteOn(poll, 1);
    await castVote({ slug: poll.slug, answers: { optionIds: [poll.options[0].id] } }, as(owner));

    const [listed] = (await listPollsVotedOn(me, { ...listParams, scope: "voted" }, now)).polls;
    expect(listed.creator.name).toBe("Owner");
    expect(listed._count.responses).toBe(2);
    expect(listed.responses).toHaveLength(1);
    expect(listed.responses[0].answers.map((answer) => answer.optionId)).toEqual([poll.options[1].id]);
  });

  it("drops a private poll once the invite is gone", async () => {
    const poll = await createChoicePoll(owner.id, ["A", "B"], { visibility: "PRIVATE" });
    const invite = await db.pollInvite.create({ data: { pollId: poll.id, email: me.email } });
    await voteOn(poll);

    const invited = await listPollsVotedOn(me, { ...listParams, scope: "voted" }, now);
    expect(invited.polls.map((item) => item.id)).toEqual([poll.id]);

    await db.pollInvite.delete({ where: { id: invite.id } });
    const revoked = await listPollsVotedOn(me, { ...listParams, scope: "voted" }, now);
    expect(revoked.polls).toEqual([]);
    expect(revoked.counts.all).toBe(0);
  });

  it("keeps a private poll reachable through a group", async () => {
    const poll = await createChoicePoll(owner.id, ["A", "B"], { visibility: "PRIVATE" });
    await db.pollInvite.create({ data: { pollId: poll.id, email: me.email } });
    await voteOn(poll);

    const group = await createGroup(owner.id, { name: "Team", emails: me.email });
    await db.pollGroup.create({ data: { pollId: poll.id, groupId: group.id } });
    await db.pollInvite.deleteMany({ where: { pollId: poll.id } });

    const result = await listPollsVotedOn(me, { ...listParams, scope: "voted" }, now);
    expect(result.polls.map((item) => item.id)).toEqual([poll.id]);
  });

  it("filters by status, searches titles and pages like the owner list", async () => {
    const open = await createChoicePoll(owner.id, ["A", "B"], { title: "Lunch spot", createdAt: at(-1) });
    const closed = await createChoicePoll(owner.id, ["A", "B"], { title: "LUNCH retro", closesAt: at(-2), createdAt: at(-3) });
    const other = await createChoicePoll(owner.id, ["A", "B"], { title: "Offsite dates", createdAt: at(-2) });
    // Vote before the deadline passes, then let it close.
    await castVote({ slug: closed.slug, answers: { optionIds: [closed.options[0].id] } }, as(me), at(-4));
    await voteOn(open);
    await voteOn(other);

    const openOnly = await listPollsVotedOn(me, { ...listParams, scope: "voted", filter: "open" }, now);
    expect(openOnly.polls.map((poll) => poll.title)).toEqual(["Lunch spot", "Offsite dates"]);
    expect(openOnly.counts).toEqual({ all: 3, open: 2, closed: 1, archived: 0 });

    const searched = await listPollsVotedOn(me, { ...listParams, scope: "voted", q: "lunch" }, now);
    expect(searched.polls.map((poll) => poll.title)).toEqual(["Lunch spot", "LUNCH retro"]);
    expect(searched.total).toBe(2);
    expect(searched.counts.all).toBe(3);

    const pastEnd = await listPollsVotedOn(me, { ...listParams, scope: "voted", page: 9 }, now);
    expect(pastEnd).toMatchObject({ page: 1, pageCount: 1, total: 3 });
  });

  it("still lists an archived poll, under its status", async () => {
    const poll = await createChoicePoll(owner.id, ["A", "B"], { title: "Archived", archivedAt: now, closedAt: at(-1) });
    await castVote({ slug: poll.slug, answers: { optionIds: [poll.options[0].id] } }, as(me), at(-2));

    const result = await listPollsVotedOn(me, { ...listParams, scope: "voted" }, now);
    expect(result.polls.map((item) => item.title)).toEqual(["Archived"]);
    expect(result.counts).toMatchObject({ all: 1, closed: 1 });
  });
});
