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

export type ChoiceOptionResult = Scored & {
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
};

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

  return { kind: "CHOICE", multi: config.multi, options, outcome, consensus, headline };
}

/**
 * Names the runner-up only when there's exactly one; listing several tied
 * labels gets ambiguous fast (labels can contain commas and "and").
 */
function runnerUpLabel(options: ChoiceOptionResult[], score: number): string {
  const tied = options.filter((option) => option.score === score);
  return tied.length === 1 ? tied[0].label : "the next options";
}
