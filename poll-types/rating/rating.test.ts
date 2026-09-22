import { describe, expect, it } from "vitest";
import { makeContext, makeOptions, makePoll, makeResponse } from "@/tests/fixtures/insights";
import { ratingPollType } from "./definition";
import { isPolarized } from "./insights";

const options = makeOptions(["Lisbon", "Berlin", "Oslo"]);
const config = { scale: 5, lowLabel: "Not keen", highLabel: "Love it" };
const rate = (a: number, b: number, c: number) => makeResponse({ "opt-1": a, "opt-2": b, "opt-3": c });

describe("rating setup and answers", () => {
  it("defaults blank end labels and only allows 5 or 10 point scales", () => {
    const labels = [{ label: "A" }, { label: "B" }];
    expect(
      ratingPollType.setupSchema.safeParse({ config: { scale: 10, lowLabel: " ", highLabel: "" }, options: labels }).data?.config,
    ).toEqual({ scale: 10, lowLabel: "Poor", highLabel: "Great" });
    expect(ratingPollType.setupSchema.safeParse({ config: { scale: 7 }, options: labels }).success).toBe(false);
  });

  it("requires a whole-number rating within the scale for every option", () => {
    const schema = ratingPollType.answersSchema({ config, options });
    expect(schema.parse({ ratings: { "opt-1": 5, "opt-2": 1, "opt-3": 3 } })).toHaveLength(3);
    expect(schema.safeParse({ ratings: { "opt-1": 5, "opt-2": 1 } }).error?.issues[0].message).toBe("Rate every option");
    expect(schema.safeParse({ ratings: { "opt-1": 6, "opt-2": 1, "opt-3": 3 } }).success).toBe(false);
    expect(schema.safeParse({ ratings: { "opt-1": 0, "opt-2": 1, "opt-3": 3 } }).success).toBe(false);
    expect(schema.safeParse({ ratings: { "opt-1": 2.5, "opt-2": 1, "opt-3": 3 } }).success).toBe(false);
  });
});

describe("rating insights", () => {
  const insights = (responses: ReturnType<typeof rate>[]) =>
    ratingPollType.computeInsights(makeContext({ poll: makePoll({ type: "RATING", config }), options, responses }));

  it("computes mean, median, spread and distribution per option", () => {
    const result = insights([rate(5, 3, 2), rate(4, 3, 2), rate(4, 2, 1)]);
    expect(result.options[0]).toMatchObject({ mean: 4.3, median: 4, count: 3, distribution: [0, 0, 0, 2, 1] });
    expect(result.outcome).toMatchObject({ kind: "LEADER", leader: { label: "Lisbon" } });
    expect(result.headline).toBe("Lisbon is rated highest: 4.3 / 5 on average from 3 ratings");
  });

  it("calls a tie when the displayed averages match", () => {
    const result = insights([rate(5, 4, 1), rate(4, 5, 1), rate(4, 4, 1)]);
    expect(result.outcome.kind).toBe("TIE");
    expect(result.headline).toBe("Tied at 4.3 / 5: Lisbon and Berlin");
  });

  it("flags an option people either love or hate, even when its average looks middling", () => {
    const result = insights([rate(4, 1, 3), rate(4, 5, 3), rate(3, 1, 3), rate(4, 5, 4)]);
    const berlin = result.options[1];
    expect(berlin.mean).toBe(3);
    expect(berlin.polarized).toBe(true);
    expect(result.options[2].polarized).toBe(false);
    expect(result.polarizedLabels).toEqual(["Berlin"]);
  });

  it("uses the bottom and top 40% of the scale and needs enough ratings", () => {
    expect(isPolarized([1, 2, 4, 5], 5)).toBe(true);
    expect(isPolarized([1, 5, 5], 5)).toBe(false);
    expect(isPolarized([1, 3, 8, 10], 10)).toBe(true);
    expect(isPolarized([5, 6, 5, 6], 10)).toBe(false);
  });
});
