import { utcDayKey } from "@/lib/datetime";
import { getPollType, type TypeInsights } from "@/poll-types/registry";
import type { InsightContext } from "./types";

/** Lines on the standings chart; more than this and the lines tangle. */
export const MAX_TREND_SERIES = 4;

export type StandingsMetric = {
  /** Axis and tooltip name, e.g. "Share of voters". */
  label: string;
  unit: "percent" | "points" | "score";
  /** Top of the y axis. */
  max: number;
};

export type StandingsTrend = {
  metric: StandingsMetric;
  /** The options drawn, best first by today's standing. */
  series: { optionId: string; label: string }[];
  /** One point per day with votes; values keyed by option id, null before anyone scored it. */
  points: { day: string; values: Record<string, number | null> }[];
  /** How many options were left off the chart. */
  hidden: number;
};

export type TurnoutPoint = { day: string; total: number };

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Each type's "how is this option doing" number, on a scale that stays
 * comparable as votes arrive (shares and averages, not raw counts that only
 * ever go up).
 */
function metricFor(insights: TypeInsights, total: number): { metric: StandingsMetric; values: Map<string, number | null> } {
  switch (insights.kind) {
    case "CHOICE":
      return {
        metric: { label: "Share of voters", unit: "percent", max: 100 },
        values: new Map(insights.options.map((option) => [option.optionId, Math.round(option.share * 100)])),
      };
    case "AVAILABILITY":
      return {
        metric: { label: "Can make it", unit: "percent", max: 100 },
        values: new Map(insights.slots.map((slot) => [slot.optionId, total ? Math.round((slot.yes / total) * 100) : 0])),
      };
    case "RANKING":
      return {
        metric: { label: "Points per ballot", unit: "points", max: insights.ballotSize },
        values: new Map(insights.options.map((option) => [option.optionId, total ? round1(option.points / total) : 0])),
      };
    case "RATING":
      return {
        metric: { label: "Average rating", unit: "score", max: insights.scale },
        values: new Map(insights.options.map((option) => [option.optionId, option.mean])),
      };
  }
}

/** The options in today's order, best first (the same order the results board uses). */
function currentOrder(insights: TypeInsights): { optionId: string; label: string; score: number }[] {
  const items = insights.kind === "AVAILABILITY" ? insights.slots.map((slot) => ({ ...slot, label: slot.shortLabel })) : insights.options;
  return [...items].sort((a, b) => b.score - a.score);
}

/**
 * Replays the poll one day at a time: standings as they stood at the end of
 * each day, using each voter's current answers bucketed by when they first voted.
 */
export function computeStandingsTrend(ctx: InsightContext, current: TypeInsights): StandingsTrend {
  const definition = getPollType(ctx.poll.type);
  const sorted = [...ctx.responses].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const order = currentOrder(current);
  const series = order.slice(0, MAX_TREND_SERIES).map(({ optionId, label }) => ({ optionId, label }));

  // The metric's name and scale depend only on the poll's config, never on the votes.
  const { metric } = metricFor(current, ctx.responses.length);
  const points: StandingsTrend["points"] = [];
  let end = 0;
  while (end < sorted.length) {
    const day = utcDayKey(sorted[end].createdAt);
    while (end < sorted.length && utcDayKey(sorted[end].createdAt) === day) end++;
    const soFar = sorted.slice(0, end);
    const result = metricFor(definition.computeInsights({ ...ctx, responses: soFar }) as TypeInsights, soFar.length);
    points.push({
      day,
      values: Object.fromEntries(series.map(({ optionId }) => [optionId, result.values.get(optionId) ?? null])),
    });
  }

  return { metric, series, points, hidden: Math.max(order.length - series.length, 0) };
}

/** Running total of responses at the end of each day with votes. */
export function computeTurnout(timeline: { day: string; count: number }[]): TurnoutPoint[] {
  let total = 0;
  return timeline.map(({ day, count }) => ({ day, total: (total += count) }));
}
