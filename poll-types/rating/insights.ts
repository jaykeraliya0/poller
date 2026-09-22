import { decideOutcome, formatList, plural, type Outcome, type Scored } from "@/lib/insights/outcome";
import { isPollOpen } from "@/lib/poll/status";
import type { InsightContext } from "@/lib/insights/types";
import type { RatingConfig } from "./definition";

export type RatingOptionResult = Scored & {
  count: number;
  /** Rounded to 1 decimal; null with no ratings. */
  mean: number | null;
  median: number | null;
  standardDeviation: number | null;
  /** distribution[i] = how many rated it i + 1. */
  distribution: number[];
  /** Many low and many high ratings at once: the mean hides a disagreement. */
  polarized: boolean;
};

export type RatingInsights = {
  kind: "RATING";
  scale: number;
  lowLabel: string;
  highLabel: string;
  /** In poll order. */
  options: RatingOptionResult[];
  outcome: Outcome<RatingOptionResult>;
  polarizedLabels: string[];
  headline: string | null;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Minimum ratings before we'll call an option polarised. */
const MIN_RATINGS_FOR_POLARISATION = 4;

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Polarised when at least 30% rated it in the bottom 40% of the scale AND at
 * least 30% in the top 40% (1–2 vs 4–5 on a 5-point scale, 1–4 vs 7–10 on 10).
 */
export function isPolarized(values: number[], scale: number): boolean {
  if (values.length < MIN_RATINGS_FOR_POLARISATION) return false;
  const lowCut = Math.floor(scale * 0.4);
  const highCut = scale - lowCut + 1;
  const share = (predicate: (value: number) => boolean) => values.filter(predicate).length / values.length;
  return share((value) => value <= lowCut) >= 0.3 && share((value) => value >= highCut) >= 0.3;
}

export function computeRatingInsights(ctx: InsightContext, config: RatingConfig): RatingInsights {
  const { scale } = config;
  const values = new Map<string, number[]>();
  for (const response of ctx.responses) {
    for (const answer of response.answers) {
      values.set(answer.optionId, [...(values.get(answer.optionId) ?? []), answer.value]);
    }
  }

  const options = ctx.options.map<RatingOptionResult>((option) => {
    const ratings = (values.get(option.id) ?? []).sort((a, b) => a - b);
    const distribution = Array.from({ length: scale }, (_, i) => ratings.filter((value) => value === i + 1).length);
    if (ratings.length === 0) {
      return { optionId: option.id, label: option.label, score: 0, count: 0, mean: null, median: null, standardDeviation: null, distribution, polarized: false };
    }
    const mean = ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
    const variance = ratings.reduce((sum, value) => sum + (value - mean) ** 2, 0) / ratings.length;
    return {
      optionId: option.id,
      label: option.label,
      // Compare on the rounded mean people see, so "4.3 vs 4.3" is a tie, not a hidden 0.01 win.
      score: round1(mean),
      count: ratings.length,
      mean: round1(mean),
      median: median(ratings),
      standardDeviation: round1(Math.sqrt(variance)),
      distribution,
      polarized: isPolarized(ratings, scale),
    };
  });

  const total = ctx.responses.length;
  const outcome = decideOutcome(options, total);
  const polarizedLabels = options.filter((option) => option.polarized).map((option) => option.label);

  let headline: string | null = null;
  if (outcome.kind === "LEADER") {
    const { leader } = outcome;
    const verb = isPollOpen(ctx.poll, ctx.now) ? "is rated highest" : "was rated highest";
    headline = `${leader.label} ${verb}: ${leader.mean} / ${scale} on average from ${plural(leader.count, "rating")}`;
  } else if (outcome.kind === "TIE") {
    headline = `Tied at ${outcome.tied[0].mean} / ${scale}: ${formatList(outcome.tied.map((option) => option.label))}`;
  }

  return {
    kind: "RATING",
    scale,
    lowLabel: config.lowLabel,
    highLabel: config.highLabel,
    options,
    outcome,
    polarizedLabels,
    headline,
  };
}
