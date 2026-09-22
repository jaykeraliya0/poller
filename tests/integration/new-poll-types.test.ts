import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { loadPollResults } from "@/lib/poll/results";
import { createPoll } from "@/lib/poll/service";
import { castVote } from "@/lib/poll/votes";
import { createUser, resetDatabase } from "@/tests/setup/db";

const settings = {
  closesAt: null,
  allowVoteChange: true,
  isAnonymous: false,
  requireLogin: false,
  resultsVisibility: "PUBLIC" as const,
  visibility: "PUBLIC" as const,
  expectedParticipants: null,
};
const guest = () => ({ userId: null, userName: null, userEmail: null, voterToken: crypto.randomUUID() });

async function setUp(type: "RANKING" | "RATING", config: object, labels: string[]) {
  const owner = await createUser();
  const { id } = await createPoll(owner.id, {
    template: "CUSTOM",
    type,
    title: `${type} poll`,
    description: "",
    config,
    options: labels.map((label) => ({ label })),
    settings,
  });
  return db.poll.findUniqueOrThrow({ where: { id }, include: { options: { orderBy: { position: "asc" } } } });
}

describe("ranking polls end to end", () => {
  beforeEach(resetDatabase);

  it("creates, records ballots and ranks by Borda points", async () => {
    const poll = await setUp("RANKING", { rankTop: 2 }, ["Dark mode", "Offline", "Search"]);
    const [dark, offline, search] = poll.options.map((option) => option.id);
    const ballots = [[dark, offline], [offline, dark], [dark, search]];
    for (const ranking of ballots) {
      await castVote({ slug: poll.slug, answers: { ranking }, voterName: "V" }, guest());
    }
    await expect(
      castVote({ slug: poll.slug, answers: { ranking: [dark] }, voterName: "V" }, guest()),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    const { insights, rows } = await loadPollResults(poll);
    expect(insights.byType).toMatchObject({ kind: "RANKING", outcome: { kind: "LEADER", leader: { label: "Dark mode", points: 5 } } });
    expect(rows.map((row) => row.summary)).toContain("1. Offline, 2. Dark mode");
  });
});

describe("rating polls end to end", () => {
  beforeEach(resetDatabase);

  it("creates, records ratings and surfaces the top-rated and polarised options", async () => {
    const poll = await setUp("RATING", { scale: 5, lowLabel: "Not keen", highLabel: "Love it" }, ["Lisbon", "Berlin"]);
    const [lisbon, berlin] = poll.options.map((option) => option.id);
    for (const [l, b] of [[5, 1], [4, 5], [4, 1], [5, 5]]) {
      await castVote({ slug: poll.slug, answers: { ratings: { [lisbon]: l, [berlin]: b } }, voterName: "V" }, guest());
    }

    const { insights } = await loadPollResults(poll);
    expect(insights.byType).toMatchObject({
      kind: "RATING",
      headline: "Lisbon is rated highest: 4.5 / 5 on average from 4 ratings",
      polarizedLabels: ["Berlin"],
    });
  });
});
