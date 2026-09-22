import { describe, expect, it } from "vitest";
import type { InsightOption } from "@/lib/insights/types";
import { makeContext, makeOptions, makePoll, makeResponse } from "@/tests/fixtures/insights";
import { rankingPollType } from "./definition";

const options = makeOptions(["Dark mode", "Offline", "CSV export", "Search"]);
const top3 = { rankTop: 3 };
const all = { rankTop: null };

/** A ballot: option ids in preference order. */
const ballot = (...ids: string[]) => makeResponse(Object.fromEntries(ids.map((id, index) => [id, index + 1])));

describe("ranking setup", () => {
  const parse = (config: object, labels = ["A", "B", "C"]) =>
    rankingPollType.setupSchema.safeParse({ config, options: labels.map((label) => ({ label })) });

  it("rejects ranking more options than exist", () => {
    expect(parse({ rankTop: 4 }).error?.issues[0].path).toEqual(["config", "rankTop"]);
  });

  it("stores 'rank all' as null so options added later are included", () => {
    expect(parse({ rankTop: 3 }).data?.config).toEqual({ rankTop: null });
    expect(parse({ rankTop: 2 }).data?.config).toEqual({ rankTop: 2 });
  });
});

describe("ranking answers", () => {
  const schema = (config: object) => rankingPollType.answersSchema({ config, options });

  it("maps the order to ranks 1..n and back", () => {
    const rows = schema(top3).parse({ ranking: ["opt-3", "opt-1", "opt-4"] });
    expect(rows).toEqual([
      { optionId: "opt-3", value: 1 },
      { optionId: "opt-1", value: 2 },
      { optionId: "opt-4", value: 3 },
    ]);
    expect(rankingPollType.toAnswerInput([...rows].reverse())).toEqual({ ranking: ["opt-3", "opt-1", "opt-4"] });
  });

  it("requires exactly the ballot size, no duplicates, no foreign ids", () => {
    expect(schema(top3).safeParse({ ranking: ["opt-1", "opt-2"] }).error?.issues[0].message).toBe("Rank your top 3");
    expect(schema(all).safeParse({ ranking: ["opt-1", "opt-2", "opt-3"] }).error?.issues[0].message).toBe("Rank every option");
    expect(schema(top3).safeParse({ ranking: ["opt-1", "opt-1", "opt-2"] }).success).toBe(false);
    expect(schema(top3).safeParse({ ranking: ["opt-1", "opt-2", "nope"] }).success).toBe(false);
  });
});

describe("ranking insights", () => {
  const insights = (responses: ReturnType<typeof ballot>[], config: object = top3, opts: InsightOption[] = options) =>
    rankingPollType.computeInsights(makeContext({ poll: makePoll({ type: "RANKING", config }), options: opts, responses }));

  it("scores with Borda points and reports average rank and first choices", () => {
    const result = insights([
      ballot("opt-1", "opt-2", "opt-3"),
      ballot("opt-1", "opt-3", "opt-2"),
      ballot("opt-2", "opt-1", "opt-4"),
    ]);
    const byLabel = Object.fromEntries(result.options.map((o) => [o.label, o]));
    expect(byLabel["Dark mode"]).toMatchObject({ points: 8, averageRank: 1.3, firstChoices: 2 });
    expect(byLabel["Offline"]).toMatchObject({ points: 6, averageRank: 2, firstChoices: 1 });
    expect(byLabel["Search"]).toMatchObject({ points: 1, timesRanked: 1 });
    expect(result.outcome).toMatchObject({ kind: "LEADER", leader: { label: "Dark mode" }, margin: 2 });
    expect(result.headline).toBe("Dark mode ranks #1 overall (average rank 1.3), first choice for 2 of 3 voters");
  });

  it("reports a tie at the top", () => {
    const result = insights([
      ballot("opt-1", "opt-2", "opt-3"),
      ballot("opt-2", "opt-1", "opt-3"),
      ballot("opt-1", "opt-2", "opt-4"),
      ballot("opt-2", "opt-1", "opt-4"),
    ]);
    expect(result.outcome.kind).toBe("TIE");
    expect(result.headline).toBe("Tied at the top: Dark mode and Offline with 10 points each");
  });

  it("treats an option added after the votes as unranked (0 points)", () => {
    const added = { ...makeOptions(["x", "x", "x", "x", "Late"])[4] };
    const result = insights([ballot("opt-1", "opt-2", "opt-3")], top3, [...options, added]);
    expect(result.options.at(-1)).toMatchObject({ label: "Late", points: 0, averageRank: null });
  });

  it("summarises and exports a ballot", () => {
    const rows = [{ optionId: "opt-2", value: 2 }, { optionId: "opt-4", value: 1 }];
    expect(rankingPollType.summarizeAnswers(rows, { config: top3, options })).toBe("1. Search, 2. Offline");
    expect(rankingPollType.csvValue(2)).toBe("2");
    expect(rankingPollType.csvValue(undefined)).toBe("");
  });
});
