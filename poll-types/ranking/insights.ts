import {
  consensusLevel,
  decideOutcome,
  formatList,
  plural,
  type Consensus,
  type Outcome,
  type Scored,
} from "@/lib/insights/outcome";
import { isPollOpen } from "@/lib/poll/status";
import type { InsightContext } from "@/lib/insights/types";
import { ballotSize, type RankingConfig } from "./definition";

type RankingOptionResult = Scored & {
  /** Borda points: rank 1 earns `ballotSize` points, the last ranked place earns 1. */
  points: number;
  /** Mean rank among ballots that ranked it; null if nobody did. */
  averageRank: number | null;
  firstChoices: number;
  /** Share of all ballots that put it first. */
  firstChoiceShare: number;
  timesRanked: number;
};

export type RankingInsights = {
  kind: "RANKING";
  ballotSize: number;
  /** In poll order. */
  options: RankingOptionResult[];
  outcome: Outcome<RankingOptionResult>;
  consensus: Consensus | null;
  headline: string | null;
  /** Top options by points; counts[i][r] = ballots that put option i at rank r + 1. */
  rankMatrix: { options: { optionId: string; label: string }[]; counts: number[][] };
  headToHead: HeadToHead;
};

/**
 * Pairwise preferences between the top options: wins[i][j] = voters who put i
 * above j (an unranked option counts as below every ranked one).
 */
export type HeadToHead = {
  options: { optionId: string; label: string }[];
  wins: number[][];
  /** Beats every other option one-on-one (over all options, not just those shown). */
  condorcetWinner: { optionId: string; label: string } | null;
};

/** Rows on the rank and head-to-head grids; past this they stop fitting a phone. */
const MAX_MATRIX_OPTIONS = 8;

const round1 = (value: number) => Math.round(value * 10) / 10;

export function computeRankingInsights(ctx: InsightContext, config: RankingConfig): RankingInsights {
  const size = ballotSize(config, ctx.options.length);
  const total = ctx.responses.length;

  const stats = new Map<string, { points: number; rankSum: number; timesRanked: number; firstChoices: number }>();
  for (const response of ctx.responses) {
    for (const { optionId, value: rank } of response.answers) {
      const entry = stats.get(optionId) ?? { points: 0, rankSum: 0, timesRanked: 0, firstChoices: 0 };
      // Unranked options (e.g. added after this ballot) simply earn nothing.
      entry.points += Math.max(size - rank + 1, 0);
      entry.rankSum += rank;
      entry.timesRanked += 1;
      if (rank === 1) entry.firstChoices += 1;
      stats.set(optionId, entry);
    }
  }

  const options = ctx.options.map<RankingOptionResult>((option) => {
    const entry = stats.get(option.id) ?? { points: 0, rankSum: 0, timesRanked: 0, firstChoices: 0 };
    return {
      optionId: option.id,
      label: option.label,
      score: entry.points,
      points: entry.points,
      averageRank: entry.timesRanked ? round1(entry.rankSum / entry.timesRanked) : null,
      firstChoices: entry.firstChoices,
      firstChoiceShare: total ? entry.firstChoices / total : 0,
      timesRanked: entry.timesRanked,
    };
  });

  const outcome = decideOutcome(options, total);
  let consensus: Consensus | null = null;
  let headline: string | null = null;

  if (outcome.kind === "LEADER") {
    const { leader, runnerUp } = outcome;
    consensus = consensusLevel(leader.firstChoiceShare, runnerUp?.firstChoiceShare ?? 0);
    const verb = isPollOpen(ctx.poll, ctx.now) ? "ranks" : "ranked";
    headline =
      `${leader.label} ${verb} #1 overall (average rank ${leader.averageRank}), ` +
      `first choice for ${leader.firstChoices} of ${plural(total, "voter")}`;
  } else if (outcome.kind === "TIE") {
    consensus = "SPLIT";
    headline = `Tied at the top: ${formatList(outcome.tied.map((option) => option.label))} with ${plural(outcome.tied[0].points, "point")} each`;
  }

  const byPoints = [...options].sort((a, b) => b.points - a.points);
  const shown = byPoints.slice(0, MAX_MATRIX_OPTIONS).map(({ optionId, label }) => ({ optionId, label }));
  const counts = shown.map(() => Array.from({ length: size }, () => 0));
  const row = new Map(shown.map((option, i) => [option.optionId, i]));
  for (const response of ctx.responses) {
    for (const { optionId, value: rank } of response.answers) {
      const i = row.get(optionId);
      if (i !== undefined && rank >= 1 && rank <= size) counts[i][rank - 1]++;
    }
  }

  return {
    kind: "RANKING",
    ballotSize: size,
    options,
    outcome,
    consensus,
    headline,
    rankMatrix: { options: shown, counts },
    headToHead: computeHeadToHead(ctx, byPoints, shown.length),
  };
}

function computeHeadToHead(ctx: InsightContext, byPoints: RankingOptionResult[], shownCount: number): HeadToHead {
  const all = byPoints.map(({ optionId, label }) => ({ optionId, label }));
  const index = new Map(all.map((option, i) => [option.optionId, i]));
  const wins = all.map(() => all.map(() => 0));
  for (const response of ctx.responses) {
    const rankOf = new Map<number, number>();
    for (const { optionId, value } of response.answers) {
      const i = index.get(optionId);
      if (i !== undefined) rankOf.set(i, value);
    }
    for (let i = 0; i < all.length; i++) {
      for (let j = 0; j < all.length; j++) {
        const a = rankOf.get(i) ?? Infinity;
        const b = rankOf.get(j) ?? Infinity;
        if (a < b) wins[i][j]++;
      }
    }
  }

  const winner = ctx.responses.length
    ? all.find((_, i) => all.every((__, j) => i === j || wins[i][j] > wins[j][i]))
    : undefined;
  return {
    options: all.slice(0, shownCount),
    wins: wins.slice(0, shownCount).map((row) => row.slice(0, shownCount)),
    condorcetWinner: winner ?? null,
  };
}
