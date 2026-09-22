import type { PollInsights } from "./index";
import { MIN_RESPONSES_FOR_OUTCOME, formatList, formatPercent, plural, type Consensus, type Outcome } from "./outcome";

/**
 * The plain-language summary of a poll's results, shared by the results page
 * and every export (PDF, image), so they always say the same thing.
 */

export const CONSENSUS_LABEL: Record<Consensus, string> = {
  STRONG: "Strong agreement",
  MODERATE: "Some agreement",
  SPLIT: "Opinions split",
};

export function fallbackHeadline({ common, byType }: PollInsights, open: boolean): string {
  switch (byType.outcome.kind) {
    case "NO_VOTES":
      return open ? "No votes yet" : "No votes";
    case "TOO_FEW":
      return open
        ? `${plural(common.totalResponses, "vote")} so far. We'll call a leader after ${MIN_RESPONSES_FOR_OUTCOME}.`
        : `Only ${plural(common.totalResponses, "vote")}, too few to call a winner.`;
    default:
      return open ? "Results so far" : "Final results";
  }
}

/** The option(s) the group landed on, when there is one to name. */
export function verdictName({ byType }: PollInsights): string | null {
  const outcome = byType.outcome;
  if (outcome.kind === "LEADER") return outcome.leader.label;
  if (outcome.kind === "TIE") return formatList(outcome.tied.map((item) => item.label));
  return null;
}

export function headlineSentence(insights: PollInsights): string {
  return insights.byType.headline ?? fallbackHeadline(insights, insights.common.status !== "CLOSED");
}

/** The outcome badge's words ("Winner", "Tie", …), for places that can't show the badge. */
export function outcomeLabel(outcome: Outcome, open: boolean): string {
  switch (outcome.kind) {
    case "LEADER":
      return open ? "Leading" : "Winner";
    case "TIE":
      return "Tie";
    case "TOO_FEW":
      return open ? "Early results" : "Too few votes";
    case "NO_SUPPORT":
      return "No clear option";
    case "NO_VOTES":
      return open ? "No votes yet" : "No votes";
  }
}

export type ResultBar = {
  optionId: string;
  label: string;
  /** Filled lengths as fractions (0–1) of the scale; two segments = "yes" then "if need be". */
  segments: [number] | [number, number];
  /** The number printed beside the bar. */
  value: string;
  /** Smaller supporting line, e.g. average rank. */
  detail: string | null;
  /** The leader, or one of the tied options. */
  leading: boolean;
};

export type ResultBars = {
  /** What the bar length means. */
  measure: string;
  /** Present when bars have two segments. */
  legend: [string, string] | null;
  bars: ResultBar[];
};

const ratio = (part: number, whole: number) => (whole > 0 ? Math.min(part / whole, 1) : 0);

/**
 * One bar per option, in the order a reader wants: best first, except
 * availability, which stays in time order like a calendar.
 */
export function resultBars({ common, byType }: PollInsights): ResultBars {
  const total = common.totalResponses;
  const outcome = byType.outcome;
  const leaders = new Set(
    outcome.kind === "LEADER" ? [outcome.leader.optionId] : outcome.kind === "TIE" ? outcome.tied.map((item) => item.optionId) : [],
  );
  const best = <T extends { score: number }>(items: T[]) => [...items].sort((a, b) => b.score - a.score);

  switch (byType.kind) {
    case "CHOICE":
      return {
        measure: byType.multi ? "Share of voters who picked each option" : "Share of votes",
        legend: null,
        bars: best(byType.options).map((option) => ({
          optionId: option.optionId,
          label: option.label,
          segments: [ratio(option.count, total)],
          value: `${option.count} · ${formatPercent(option.share)}`,
          detail: null,
          leading: leaders.has(option.optionId),
        })),
      };
    case "AVAILABILITY":
      return {
        measure: "Who can make each slot",
        legend: ["Yes", "If need be"],
        bars: byType.slots.map((slot) => ({
          optionId: slot.optionId,
          label: slot.label,
          segments: [ratio(slot.yes, total), ratio(slot.maybe, total)],
          value: `${slot.yes} yes${slot.maybe ? ` · ${slot.maybe} if need be` : ""}`,
          detail: slot.unanswered ? `${slot.unanswered} answered before this slot was added` : null,
          leading: leaders.has(slot.optionId),
        })),
      };
    case "RANKING": {
      const maxPoints = byType.ballotSize * total;
      return {
        measure: `Borda points (1st place earns ${byType.ballotSize})`,
        legend: null,
        bars: best(byType.options).map((option) => ({
          optionId: option.optionId,
          label: option.label,
          segments: [ratio(option.points, maxPoints)],
          value: plural(option.points, "point"),
          detail:
            option.averageRank === null
              ? "Not ranked yet"
              : `Average rank ${option.averageRank} · ${plural(option.firstChoices, "first choice")}`,
          leading: leaders.has(option.optionId),
        })),
      };
    }
    case "RATING":
      return {
        measure: `Average rating out of ${byType.scale}`,
        legend: null,
        bars: best(byType.options).map((option) => ({
          optionId: option.optionId,
          label: option.label,
          segments: [ratio(option.mean ?? 0, byType.scale)],
          value: option.mean === null ? "No ratings" : `${option.mean} / ${byType.scale}`,
          detail:
            option.count === 0
              ? null
              : `${plural(option.count, "rating")} · median ${option.median}${option.polarized ? " · opinions split" : ""}`,
          leading: leaders.has(option.optionId),
        })),
      };
  }
}
