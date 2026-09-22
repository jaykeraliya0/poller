import { describe, expect, it } from "vitest";
import { makeContext, makeOptions, makePoll, makeResponse } from "@/tests/fixtures/insights";
import { getPollType, type TypeInsights } from "@/poll-types/registry";
import { computeStandingsTrend, computeTurnout, MAX_TREND_SERIES } from "./trends";
import type { InsightContext } from "./types";

const on = (day: string) => ({ createdAt: new Date(`${day}T10:00:00Z`) });
const standings = (ctx: InsightContext) =>
  computeStandingsTrend(ctx, getPollType(ctx.poll.type).computeInsights(ctx) as TypeInsights);

describe("computeStandingsTrend", () => {
  it("replays choice shares day by day, ordered by today's standing", () => {
    const ctx = makeContext({
      responses: [
        makeResponse({ "opt-1": 1 }, on("2026-09-20")),
        makeResponse({ "opt-1": 1 }, on("2026-09-20")),
        makeResponse({ "opt-2": 1 }, on("2026-09-21")),
        makeResponse({ "opt-2": 1 }, on("2026-09-21")),
        makeResponse({ "opt-2": 1 }, on("2026-09-21")),
      ],
    });
    const trend = standings(ctx);

    expect(trend.metric).toEqual({ label: "Share of voters", unit: "percent", max: 100 });
    expect(trend.series.map((item) => item.label)).toEqual(["Sushi", "Pizza", "Tacos"]);
    expect(trend.hidden).toBe(0);
    expect(trend.points).toEqual([
      { day: "2026-09-20", values: { "opt-2": 0, "opt-1": 100, "opt-3": 0 } },
      { day: "2026-09-21", values: { "opt-2": 60, "opt-1": 40, "opt-3": 0 } },
    ]);
  });

  it("caps the lines and counts the options left off", () => {
    const labels = ["A", "B", "C", "D", "E", "F"];
    const trend = standings(makeContext({ options: makeOptions(labels), responses: [makeResponse({ "opt-1": 1 })] }));
    expect(trend.series).toHaveLength(MAX_TREND_SERIES);
    expect(trend.hidden).toBe(labels.length - MAX_TREND_SERIES);
  });

  it("uses average ratings, null until an option has been rated", () => {
    const ctx = makeContext({
      poll: makePoll({ type: "RATING", config: { scale: 5 } }),
      options: makeOptions(["Lisbon", "Porto"]),
      responses: [
        makeResponse({ "opt-1": 4 }, on("2026-09-20")),
        makeResponse({ "opt-1": 2, "opt-2": 5 }, on("2026-09-21")),
      ],
    });
    const trend = standings(ctx);
    expect(trend.metric).toMatchObject({ unit: "score", max: 5 });
    expect(trend.points.map((point) => point.values)).toEqual([
      { "opt-2": null, "opt-1": 4 },
      { "opt-2": 5, "opt-1": 3 },
    ]);
  });

  it("uses points per ballot for rankings", () => {
    const ctx = makeContext({
      poll: makePoll({ type: "RANKING", config: { rankTop: null } }),
      options: makeOptions(["A", "B"]),
      responses: [makeResponse({ "opt-1": 1, "opt-2": 2 }), makeResponse({ "opt-1": 2, "opt-2": 1 })],
    });
    const trend = standings(ctx);
    expect(trend.metric).toMatchObject({ unit: "points", max: 2 });
    expect(trend.points).toEqual([{ day: "2026-09-21", values: { "opt-1": 1.5, "opt-2": 1.5 } }]);
  });

  it("has no points without votes", () => {
    expect(standings(makeContext()).points).toEqual([]);
  });
});

describe("computeTurnout", () => {
  it("accumulates the daily counts", () => {
    expect(
      computeTurnout([
        { day: "2026-09-20", count: 2 },
        { day: "2026-09-22", count: 3 },
      ]),
    ).toEqual([
      { day: "2026-09-20", total: 2 },
      { day: "2026-09-22", total: 5 },
    ]);
  });
});
