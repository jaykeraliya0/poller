import { describe, expect, it } from "vitest";
import { consensusLevel, decideOutcome, formatList } from "./outcome";

const scored = (...scores: number[]) =>
  scores.map((score, i) => ({ optionId: `o${i}`, label: `Option ${i}`, score }));

describe("decideOutcome", () => {
  it("reports no votes", () => {
    expect(decideOutcome(scored(0, 0), 0)).toEqual({ kind: "NO_VOTES" });
  });

  it("refuses to call a winner with 1–2 responses", () => {
    expect(decideOutcome(scored(2, 0), 2)).toEqual({ kind: "TOO_FEW", responses: 2 });
  });

  it("detects an exact tie between the top options", () => {
    const outcome = decideOutcome(scored(3, 5, 5), 13);
    expect(outcome.kind).toBe("TIE");
    if (outcome.kind === "TIE") expect(outcome.tied.map((o) => o.optionId)).toEqual(["o1", "o2"]);
  });

  it("picks a leader with margin over the runner-up", () => {
    const outcome = decideOutcome(scored(2, 7, 4), 13);
    expect(outcome).toMatchObject({
      kind: "LEADER",
      leader: { optionId: "o1" },
      runnerUp: { optionId: "o2" },
      margin: 3,
    });
  });

  it("reports no support when nothing scored", () => {
    expect(decideOutcome(scored(0, 0), 4)).toEqual({ kind: "NO_SUPPORT" });
  });

  it("does not mutate its input order", () => {
    const items = scored(1, 3, 2);
    decideOutcome(items, 6);
    expect(items.map((i) => i.score)).toEqual([1, 3, 2]);
  });
});

describe("consensusLevel", () => {
  it.each([
    [0.7, 0.2, "STRONG"],
    [0.6, 0.45, "MODERATE"],
    [0.45, 0.4, "SPLIT"],
    [0.5, 0.3, "MODERATE"],
  ] as const)("top %d vs %d → %s", (top, second, expected) => {
    expect(consensusLevel(top, second)).toBe(expected);
  });
});

describe("formatList", () => {
  it("joins labels naturally", () => {
    expect(formatList(["A"])).toBe("A");
    expect(formatList(["A", "B"])).toBe("A and B");
    expect(formatList(["A", "B", "C"])).toBe("A, B, and C");
  });
});
