import { beforeEach, describe, expect, it } from "vitest";
import { POLLS_PER_PAGE } from "@/lib/poll/list-params";
import { listPollsForOwner } from "@/lib/poll/service";
import { createChoicePoll, createUser, resetDatabase } from "@/tests/setup/db";

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

    const first = await listPollsForOwner(ownerId, { filter: "all", q: "", page: 1 }, now);
    expect(first).toMatchObject({ total, page: 1, pageCount: 2, counts: { all: total, open: total, closed: 0 } });
    expect(first.polls.map((poll) => poll.title)).toEqual(
      Array.from({ length: POLLS_PER_PAGE }, (_, index) => `Poll ${index}`),
    );

    const second = await listPollsForOwner(ownerId, { filter: "all", q: "", page: 2 }, now);
    expect(second.polls.map((poll) => poll.title)).toEqual(["Poll 10", "Poll 11", "Poll 12"]);
  });

  it("clamps a page past the end to the last page", async () => {
    await createChoicePoll(ownerId);
    const result = await listPollsForOwner(ownerId, { filter: "all", q: "", page: 9 }, now);
    expect(result).toMatchObject({ page: 1, pageCount: 1, total: 1 });
    expect(result.polls).toHaveLength(1);
  });

  it("filters by status the same way getPollStatus does", async () => {
    await createChoicePoll(ownerId, ["A", "B"], { title: "No deadline" });
    await createChoicePoll(ownerId, ["A", "B"], { title: "Deadline ahead", closesAt: at(2) });
    await createChoicePoll(ownerId, ["A", "B"], { title: "Deadline passed", closesAt: at(-2) });
    await createChoicePoll(ownerId, ["A", "B"], { title: "Closed by hand", closedAt: at(-1) });

    const titles = async (filter: "open" | "closed") =>
      (await listPollsForOwner(ownerId, { filter, q: "", page: 1 }, now)).polls.map((poll) => poll.title).sort();

    expect(await titles("open")).toEqual(["Deadline ahead", "No deadline"]);
    expect(await titles("closed")).toEqual(["Closed by hand", "Deadline passed"]);
    const { counts } = await listPollsForOwner(ownerId, { filter: "open", q: "", page: 1 }, now);
    expect(counts).toEqual({ all: 4, open: 2, closed: 2 });
  });

  it("searches titles case-insensitively within the chosen status", async () => {
    await createChoicePoll(ownerId, ["A", "B"], { title: "Team lunch" });
    await createChoicePoll(ownerId, ["A", "B"], { title: "LUNCH vote", closedAt: at(-1) });
    await createChoicePoll(ownerId, ["A", "B"], { title: "Offsite dates" });

    const all = await listPollsForOwner(ownerId, { filter: "all", q: "lunch", page: 1 }, now);
    expect(all.total).toBe(2);
    // Tab counts describe every poll, not just the search matches.
    expect(all.counts.all).toBe(3);

    const closed = await listPollsForOwner(ownerId, { filter: "closed", q: "lunch", page: 1 }, now);
    expect(closed.polls.map((poll) => poll.title)).toEqual(["LUNCH vote"]);
  });
});
