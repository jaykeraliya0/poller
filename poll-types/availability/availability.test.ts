import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InsightOption } from "@/lib/insights/types";
import { makeContext, makePoll, makeResponse } from "@/tests/fixtures/insights";
import { availabilityPollType } from "./definition";

const TZ = "Europe/London";
const config = { timezone: TZ };

/** Slots in BST (UTC+1): Fri 25 Sep 6pm, Fri 8pm, Sat 26 Sep 10am. */
const slots: InsightOption[] = [
  ["2026-09-25T17:00:00Z", "2026-09-25T19:00:00Z"],
  ["2026-09-25T19:00:00Z", "2026-09-25T21:00:00Z"],
  ["2026-09-26T09:00:00Z", "2026-09-26T11:00:00Z"],
].map(([start, end], position) => ({
  id: `slot-${position + 1}`,
  label: `Slot ${position + 1}`,
  position,
  startsAt: new Date(start),
  endsAt: new Date(end),
  createdAt: new Date("2026-09-20T09:00:00Z"),
}));

const Y = 2;
const M = 1;
const N = 0;
const vote = (a: number, b: number, c: number) =>
  makeResponse({ "slot-1": a, "slot-2": b, "slot-3": c });

describe("availability setup", () => {
  const parse = (input: unknown) => availabilityPollType.setupSchema.safeParse(input);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("sorts slots chronologically and labels them in the poll time zone", () => {
    const result = parse({
      config,
      options: [
        { startsAt: "2026-09-26T09:00:00Z", endsAt: "2026-09-26T10:30:00Z" },
        { startsAt: "2026-09-25T17:00:00Z", endsAt: "2026-09-25T19:00:00Z" },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.data!.options.map((o) => [o.position, o.label])).toEqual([
      [0, "Fri 25 Sep, 6pm – 8pm"],
      [1, "Sat 26 Sep, 10am – 11:30am"],
    ]);
  });

  it("rejects an unknown time zone, reversed slots and duplicates", () => {
    const slot = { startsAt: "2026-09-25T17:00:00Z", endsAt: "2026-09-25T19:00:00Z" };
    expect(parse({ config: { timezone: "Mars/Olympus" }, options: [slot, slot] }).success).toBe(false);

    const reversed = parse({
      config,
      options: [slot, { startsAt: "2026-09-26T10:00:00Z", endsAt: "2026-09-26T09:00:00Z" }],
    });
    expect(reversed.error?.issues[0].path).toEqual(["options", 1, "endsAt"]);

    const duplicate = parse({ config, options: [slot, { ...slot }] });
    expect(duplicate.error?.issues[0].message).toBe("Duplicate time slot");
  });

  it("rejects slots that have already started", () => {
    const past = { startsAt: "2026-09-22T11:00:00Z", endsAt: "2026-09-22T13:00:00Z" };
    const slot = { startsAt: "2026-09-25T17:00:00Z", endsAt: "2026-09-25T19:00:00Z" };
    const result = parse({ config, options: [slot, past] });
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ["options", 1, "startsAt"], message: "This time slot is in the past" }),
    ]);
  });
});

describe("availability answers", () => {
  const schema = availabilityPollType.answersSchema({ config, options: slots });

  it("maps yes / if need be / no to 2 / 1 / 0", () => {
    const rows = schema.parse({ availability: { "slot-1": Y, "slot-2": M, "slot-3": N } });
    expect(rows).toEqual([
      { optionId: "slot-1", value: 2 },
      { optionId: "slot-2", value: 1 },
      { optionId: "slot-3", value: 0 },
    ]);
    expect(availabilityPollType.toAnswerInput(rows)).toEqual({
      availability: { "slot-1": 2, "slot-2": 1, "slot-3": 0 },
    });
  });

  it("requires every slot, valid values and known slot ids", () => {
    expect(schema.safeParse({ availability: { "slot-1": Y, "slot-2": Y } }).success).toBe(false);
    expect(
      schema.safeParse({ availability: { "slot-1": 3, "slot-2": Y, "slot-3": Y } }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ availability: { "slot-1": Y, "slot-2": Y, "slot-3": Y, other: Y } })
        .success,
    ).toBe(false);
  });
});

describe("availability insights", () => {
  const insights = (responses = [vote(Y, N, N)].slice(0, 0), options = slots) =>
    availabilityPollType.computeInsights(
      makeContext({ poll: makePoll({ type: "AVAILABILITY", config }), options, responses }),
    );

  it("groups slots by day in the poll time zone", () => {
    expect(insights().days).toEqual([
      { key: "2026-09-25", label: "Fri 25 Sep", slotIds: ["slot-1", "slot-2"] },
      { key: "2026-09-26", label: "Sat 26 Sep", slotIds: ["slot-3"] },
    ]);
  });

  it("builds the use-case sentence for the best slot", () => {
    const result = insights([vote(Y, M, N), vote(Y, Y, N), vote(M, Y, Y), vote(Y, N, Y)]);
    expect(result.outcome).toMatchObject({ kind: "LEADER", leader: { optionId: "slot-1" } });
    expect(result.headline).toBe("Fri 6pm works for 3/4 people (+1 if need be)");
  });

  it("ranks any 'yes' above 'if need be'", () => {
    const result = insights([vote(Y, M, N), vote(N, M, N), vote(N, M, N)]);
    expect(result.outcome).toMatchObject({ leader: { optionId: "slot-1" } });
  });

  it("says 'everyone' when all voters are free", () => {
    const result = insights([vote(Y, N, N), vote(Y, M, N), vote(Y, N, Y)]);
    expect(result.headline).toBe("Fri 6pm works for everyone (3/3)");
  });

  it("reports ties between slots", () => {
    const result = insights([vote(Y, N, Y), vote(Y, N, Y), vote(N, N, N)]);
    expect(result.outcome.kind).toBe("TIE");
    expect(result.headline).toBe("Fri 6pm and Sat 10am each work for 2/3 people");
  });

  it("reports when no slot works", () => {
    const result = insights([vote(N, N, N), vote(N, N, N), vote(N, N, N)]);
    expect(result.outcome.kind).toBe("NO_SUPPORT");
    expect(result.headline).toBe("None of the time slots work for anyone yet");
  });

  it("counts earlier voters as unanswered for a slot added after they voted", () => {
    const added: InsightOption = {
      id: "slot-4",
      label: "Sun",
      position: 3,
      startsAt: new Date("2026-09-28T09:00:00Z"),
      endsAt: new Date("2026-09-28T10:00:00Z"),
      createdAt: new Date("2026-09-22T09:00:00Z"),
    };
    const result = insights([vote(Y, N, N), makeResponse({ "slot-4": Y })], [...slots, added]);
    expect(result.slots.find((s) => s.optionId === "slot-4")).toMatchObject({
      yes: 1,
      unanswered: 1,
    });
  });
});

describe("availability summarizeAnswers", () => {
  it("lists yes and if-need-be slots in the poll's time zone", () => {
    const rows = [
      { optionId: "slot-1", value: 2 },
      { optionId: "slot-2", value: 1 },
      { optionId: "slot-3", value: 2 },
    ];
    expect(availabilityPollType.summarizeAnswers(rows, { config, options: slots })).toBe(
      "Yes: Fri 6pm, Sat 10am · If need be: Fri 8pm",
    );
    expect(availabilityPollType.summarizeAnswers([{ optionId: "slot-1", value: 0 }], { config, options: slots })).toBe(
      "None of these times",
    );
  });
});
