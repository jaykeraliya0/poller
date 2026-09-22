import { describe, expect, it } from "vitest";
import { choiceVotes, makeContext, makeOptions, makePoll } from "@/tests/fixtures/insights";
import { choicePollType } from "./definition";

const options = makeOptions(["Pizza", "Sushi", "Tacos"]);
const single = { multi: false, maxSelections: null };
const multi = (maxSelections: number | null = null) => ({ multi: true, maxSelections });

describe("choice setup", () => {
  const parse = (input: unknown) => choicePollType.setupSchema.safeParse(input);

  it("trims labels and assigns positions", () => {
    const result = parse({ config: single, options: [{ label: " Pizza " }, { label: "Sushi" }] });
    expect(result.success && result.data.options).toEqual([
      { label: "Pizza", position: 0, startsAt: null, endsAt: null },
      { label: "Sushi", position: 1, startsAt: null, endsAt: null },
    ]);
  });

  it("requires at least two options", () => {
    const result = parse({ config: single, options: [{ label: "Only" }] });
    expect(result.success).toBe(false);
  });

  it("rejects empty and case-insensitive duplicate labels with a field path", () => {
    const result = parse({
      config: single,
      options: [{ label: "Pizza" }, { label: "pizza" }, { label: "  " }],
    });
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((issue) => issue.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["options.1.label", "options.2.label"]));
  });

  it("rejects more than 20 options", () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ label: `Option ${i}` }));
    expect(parse({ config: single, options: many }).success).toBe(false);
  });

  it("caps max selections at the option count and drops it for single choice", () => {
    const two = [{ label: "A" }, { label: "B" }];
    expect(parse({ config: multi(3), options: two }).success).toBe(false);
    const result = parse({ config: { multi: false, maxSelections: 2 }, options: two });
    expect(result.success && result.data.config).toEqual({ multi: false, maxSelections: null });
  });
});

describe("choice answers", () => {
  const schema = (config: object) => choicePollType.answersSchema({ config, options });

  it("maps a single pick to one answer row", () => {
    expect(schema(single).parse({ optionIds: ["opt-2"] })).toEqual([{ optionId: "opt-2", value: 1 }]);
  });

  it("rejects no selection, two picks on single choice, and unknown options", () => {
    expect(schema(single).safeParse({ optionIds: [] }).success).toBe(false);
    expect(schema(single).safeParse({ optionIds: ["opt-1", "opt-2"] }).success).toBe(false);
    expect(schema(single).safeParse({ optionIds: ["other-poll-option"] }).success).toBe(false);
  });

  it("enforces max selections and uniqueness on multi choice", () => {
    expect(schema(multi(2)).safeParse({ optionIds: ["opt-1", "opt-2"] }).success).toBe(true);
    expect(schema(multi(2)).safeParse({ optionIds: ["opt-1", "opt-2", "opt-3"] }).success).toBe(false);
    expect(schema(multi()).safeParse({ optionIds: ["opt-1", "opt-1"] }).success).toBe(false);
  });

  it("round-trips stored rows back to form input", () => {
    const rows = schema(multi()).parse({ optionIds: ["opt-1", "opt-3"] });
    expect(choicePollType.toAnswerInput(rows)).toEqual({ optionIds: ["opt-1", "opt-3"] });
  });
});

describe("choice insights", () => {
  const insights = (responses = choiceVotes(), poll = makePoll()) =>
    choicePollType.computeInsights(makeContext({ poll, options, responses }));

  it("returns zero counts and no headline with no votes", () => {
    const result = insights();
    expect(result.outcome).toEqual({ kind: "NO_VOTES" });
    expect(result.options.map((o) => o.count)).toEqual([0, 0, 0]);
    expect(result.headline).toBeNull();
  });

  it("shows counts but no winner or consensus with 1–2 votes", () => {
    const result = insights(choiceVotes(["opt-1"], ["opt-1"]));
    expect(result.outcome.kind).toBe("TOO_FEW");
    expect(result.options[0].count).toBe(2);
    expect(result.consensus).toBeNull();
    expect(result.headline).toBeNull();
  });

  it("names the leader with share and margin", () => {
    const result = insights(choiceVotes(["opt-2"], ["opt-2"], ["opt-2"], ["opt-1"], ["opt-3"]));
    expect(result.outcome).toMatchObject({ kind: "LEADER", leader: { label: "Sushi" }, margin: 2 });
    expect(result.options[1].share).toBeCloseTo(0.6);
    expect(result.consensus).toBe("STRONG");
    expect(result.headline).toBe("Sushi leads with 3 of 5 votes (60%), 2 ahead of Pizza");
  });

  it("says 'won' once the poll is closed", () => {
    const closed = makePoll({ closedAt: new Date("2026-09-22T00:00:00Z") });
    const result = insights(choiceVotes(["opt-1"], ["opt-1"], ["opt-2"]), closed);
    expect(result.headline).toMatch(/^Pizza won with 2 of 3 votes/);
  });

  it("reports an exact tie without a winner", () => {
    const result = insights(choiceVotes(["opt-1"], ["opt-3"], ["opt-1"], ["opt-3"]));
    expect(result.outcome.kind).toBe("TIE");
    expect(result.consensus).toBe("SPLIT");
    expect(result.headline).toBe("Tied between Pizza and Tacos with 2 votes each");
  });

  it("computes shares per respondent on multi-select polls", () => {
    const poll = makePoll({ config: multi() });
    const result = insights(choiceVotes(["opt-1", "opt-2"], ["opt-1"], ["opt-1", "opt-3"]), poll);
    expect(result.multi).toBe(true);
    expect(result.options.map((o) => o.share)).toEqual([1, 1 / 3, 1 / 3]);
    expect(result.consensus).toBe("STRONG");
  });
});
