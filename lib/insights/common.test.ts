import { describe, expect, it } from "vitest";
import { makeContext, makePoll, makeResponse } from "@/tests/fixtures/insights";
import { computeCommonInsights, computeResponseRate } from "./common";

describe("computeResponseRate", () => {
  it("is null without an expected participant count", () => {
    expect(computeResponseRate(4, null)).toBeNull();
  });

  it("computes a normal rate", () => {
    expect(computeResponseRate(3, 4)).toEqual({
      ratio: 0.75,
      percent: 75,
      ringValue: 0.75,
      exceedsExpected: false,
    });
  });

  it("shows 100%+ but clamps the ring when more people voted than expected", () => {
    expect(computeResponseRate(12, 10)).toEqual({
      ratio: 1.2,
      percent: 120,
      ringValue: 1,
      exceedsExpected: true,
    });
  });
});

describe("computeCommonInsights", () => {
  it("handles a poll with no votes", () => {
    const insights = computeCommonInsights(makeContext());
    expect(insights).toMatchObject({
      totalResponses: 0,
      hasEnoughData: false,
      timeline: [],
      comments: [],
      lastResponseAt: null,
      status: "OPEN",
    });
  });

  it("marks 1–2 responses as not enough data", () => {
    const responses = [makeResponse({}), makeResponse({})];
    expect(computeCommonInsights(makeContext({ responses })).hasEnoughData).toBe(false);
  });

  it("groups responses per day for the timeline", () => {
    const responses = [
      makeResponse({}, { createdAt: new Date("2026-09-21T08:00:00Z") }),
      makeResponse({}, { createdAt: new Date("2026-09-21T20:00:00Z") }),
      makeResponse({}, { createdAt: new Date("2026-09-20T10:00:00Z") }),
    ];
    const { timeline, hasEnoughData } = computeCommonInsights(makeContext({ responses }));
    expect(hasEnoughData).toBe(true);
    expect(timeline).toEqual([
      { day: "2026-09-20", count: 1 },
      { day: "2026-09-21", count: 2 },
    ]);
  });

  it("lists comments newest first with names on named polls", () => {
    const responses = [
      makeResponse({}, { voterName: "Ana", comment: "Early!", createdAt: new Date("2026-09-20T10:00:00Z") }),
      makeResponse({}, { voterName: "Ben", comment: "  ", createdAt: new Date("2026-09-21T10:00:00Z") }),
      makeResponse({}, { voterName: "Cy", comment: "Late", createdAt: new Date("2026-09-21T11:00:00Z") }),
    ];
    const { comments } = computeCommonInsights(makeContext({ responses }));
    expect(comments.map((c) => [c.author, c.text])).toEqual([
      ["Cy", "Late"],
      ["Ana", "Early!"],
    ]);
    expect(comments[0].at).toEqual(new Date("2026-09-21T11:00:00Z"));
  });

  it("strips names and exact times from comments on anonymous polls", () => {
    const responses = [
      makeResponse({}, { voterName: "Ana", comment: "Secret", createdAt: new Date("2026-09-21T10:42:00Z") }),
    ];
    const { comments } = computeCommonInsights(
      makeContext({ poll: makePoll({ isAnonymous: true }), responses }),
    );
    expect(comments).toEqual([
      { id: responses[0].id, text: "Secret", author: null, day: "2026-09-21", at: null },
    ]);
  });

  it("reports closed status and the close time", () => {
    const closedAt = new Date("2026-09-22T08:00:00Z");
    const insights = computeCommonInsights(makeContext({ poll: makePoll({ closedAt }) }));
    expect(insights.status).toBe("CLOSED");
    expect(insights.closedAt).toEqual(closedAt);
  });
});
