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
};

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

  return { kind: "RANKING", ballotSize: size, options, outcome, consensus, headline };
}
