import {
  consensusLevel,
  decideOutcome,
  formatList,
  formatPercent,
  plural,
  type Consensus,
  type Outcome,
  type Scored,
} from "@/lib/insights/outcome";
import { isPollOpen } from "@/lib/poll/status";
import type { InsightContext } from "@/lib/insights/types";
import type { ChoiceConfig } from "./definition";

type ChoiceOptionResult = Scored & {
  /** Votes for this option. Same as `score`, named for readability in the UI. */
  count: number;
  /** Share of respondents who picked it (multi-select shares can sum above 1). */
  share: number;
};

export type ChoiceInsights = {
  kind: "CHOICE";
  multi: boolean;
  /** In poll order. */
  options: ChoiceOptionResult[];
  outcome: Outcome<ChoiceOptionResult>;
  consensus: Consensus | null;
  headline: string | null;
  /** Multi-select only: picksPerBallot[i] = voters who picked i + 1 options. */
  picksPerBallot: number[] | null;
  /** Multi-select only: how often each pair of options was picked together. */
  coPicks: CoPicks | null;
};

/** Top options by votes, and together[i][j] = voters who picked both i and j (the diagonal is i's own count). */
export type CoPicks = { options: { optionId: string; label: string; count: number }[]; together: number[][] };

/** Rows and columns on the co-pick grid; past this it stops fitting a phone. */
const MAX_CO_PICK_OPTIONS = 8;

export function computeChoiceInsights(ctx: InsightContext, config: ChoiceConfig): ChoiceInsights {
  const total = ctx.responses.length;
  const counts = new Map<string, number>();
  for (const response of ctx.responses) {
    for (const answer of response.answers) {
      counts.set(answer.optionId, (counts.get(answer.optionId) ?? 0) + 1);
    }
  }

  const options = ctx.options.map<ChoiceOptionResult>((option) => {
    const count = counts.get(option.id) ?? 0;
    return {
      optionId: option.id,
      label: option.label,
      score: count,
      count,
      share: total === 0 ? 0 : count / total,
    };
  });

  const outcome = decideOutcome(options, total);
  const open = isPollOpen(ctx.poll, ctx.now);

  let consensus: Consensus | null = null;
  let headline: string | null = null;

  if (outcome.kind === "LEADER") {
    const { leader, runnerUp, margin } = outcome;
    consensus = consensusLevel(leader.share, runnerUp?.share ?? 0);
    const verb = open ? "leads" : "won";
    const votes = `${leader.count} of ${plural(total, "vote")} (${formatPercent(leader.share)})`;
    headline = runnerUp
      ? `${leader.label} ${verb} with ${votes}, ${margin} ahead of ${runnerUpLabel(options, runnerUp.score)}`
      : `${leader.label} ${verb} with ${votes}`;
  } else if (outcome.kind === "TIE") {
    consensus = "SPLIT";
    const [first] = outcome.tied;
    headline = `Tied between ${formatList(outcome.tied.map((option) => option.label))} with ${plural(first.count, "vote")} each`;
  }

  return {
    kind: "CHOICE",
    multi: config.multi,
    options,
    outcome,
    consensus,
    headline,
    picksPerBallot: config.multi ? computePicksPerBallot(ctx, options.length) : null,
    coPicks: config.multi ? computeCoPicks(ctx, options) : null,
  };
}

function computePicksPerBallot(ctx: InsightContext, optionCount: number): number[] {
  const counts = Array.from({ length: optionCount }, () => 0);
  for (const response of ctx.responses) {
    const picked = response.answers.length;
    if (picked > 0) counts[Math.min(picked, optionCount) - 1]++;
  }
  // Trim trailing zeros so the chart ends at the biggest ballot anyone cast.
  let last = counts.length;
  while (last > 1 && counts[last - 1] === 0) last--;
  return counts.slice(0, last);
}

function computeCoPicks(ctx: InsightContext, options: ChoiceOptionResult[]): CoPicks {
  const top = [...options]
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_CO_PICK_OPTIONS)
    .map(({ optionId, label, count }) => ({ optionId, label, count }));
  const index = new Map(top.map((option, i) => [option.optionId, i]));
  const together = top.map(() => top.map(() => 0));
  for (const response of ctx.responses) {
    const picked = response.answers.map((answer) => index.get(answer.optionId)).filter((i) => i !== undefined);
    for (const a of picked) for (const b of picked) together[a][b]++;
  }
  return { options: top, together };
}

/**
 * Names the runner-up only when there's exactly one; listing several tied
 * labels gets ambiguous fast (labels can contain commas and "and").
 */
function runnerUpLabel(options: ChoiceOptionResult[], score: number): string {
  const tied = options.filter((option) => option.score === score);
  return tied.length === 1 ? tied[0].label : "the next options";
}
