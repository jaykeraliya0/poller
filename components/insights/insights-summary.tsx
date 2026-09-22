import { SplitIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/datetime";
import type { PollInsights } from "@/lib/insights";
import { MIN_RESPONSES_FOR_OUTCOME, formatList, plural, type Consensus } from "@/lib/insights/outcome";
import { Meter } from "./meter";
import { OutcomeBadge } from "./outcome-badge";
import { StatTile } from "./stat-tile";

const CONSENSUS_LABEL: Record<Consensus, string> = {
  STRONG: "Strong agreement",
  MODERATE: "Some agreement",
  SPLIT: "Opinions split",
};

function fallbackHeadline({ common, byType }: PollInsights): string {
  switch (byType.outcome.kind) {
    case "NO_VOTES":
      return "No votes yet";
    case "TOO_FEW":
      return `${plural(common.totalResponses, "vote")} so far. We'll call a leader after ${MIN_RESPONSES_FOR_OUTCOME}.`;
    default:
      return "Results so far";
  }
}

/** "+2 votes" / "+1 person": how far ahead the leader is, in the type's own units. */
function leadStat({ byType }: PollInsights): { value: string; detail: string } {
  const outcome = byType.outcome;
  if (outcome.kind === "TIE") return { value: "Tied", detail: `${outcome.tied.length} options level` };
  if (outcome.kind !== "LEADER" || !outcome.runnerUp) return { value: "—", detail: "Not enough votes yet" };

  const runnerUpLabel = outcome.runnerUp.label;
  switch (byType.kind) {
    case "CHOICE":
      return { value: `+${outcome.margin}`, detail: `${plural(outcome.margin, "vote")} ahead of ${runnerUpLabel}` };
    case "RANKING":
      return { value: `+${outcome.margin}`, detail: `${plural(outcome.margin, "point")} ahead of ${runnerUpLabel}` };
    case "RATING":
      return { value: `+${Math.round(outcome.margin * 10) / 10}`, detail: `higher average than ${runnerUpLabel}` };
    case "AVAILABILITY":
      break;
  }
  const leader = byType.slots.find((slot) => slot.optionId === outcome.leader.optionId)!;
  const runnerUp = byType.slots.find((slot) => slot.optionId === outcome.runnerUp!.optionId)!;
  const morePeople = leader.yes - runnerUp.yes;
  return morePeople > 0
    ? { value: `+${morePeople}`, detail: `${morePeople === 1 ? "person" : "people"} more than ${runnerUp.shortLabel}` }
    : { value: `+${leader.maybe - runnerUp.maybe}`, detail: `more "if need be" than ${runnerUp.shortLabel}` };
}

/** The option(s) the group landed on, when there is one to name. */
function verdictName({ byType }: PollInsights): string | null {
  const outcome = byType.outcome;
  if (outcome.kind === "LEADER") return outcome.leader.label;
  if (outcome.kind === "TIE") return formatList(outcome.tied.map((item) => item.label));
  return null;
}

/**
 * The answer to "so what did the group decide?": the winning option's name set
 * large, so it reads at a glance, with the explanation underneath.
 */
export function InsightsHeadline({ insights }: { insights: PollInsights }) {
  const { common, byType } = insights;
  const open = common.status !== "CLOSED";
  const consensus =
    (byType.kind === "CHOICE" || byType.kind === "RANKING") && common.hasEnoughData ? byType.consensus : null;
  const polarized = byType.kind === "RATING" && common.hasEnoughData ? byType.polarizedLabels : [];
  const name = verdictName(insights);
  const sentence = byType.headline ?? fallbackHeadline(insights);

  return (
    <section aria-labelledby="insights-heading" className="flex flex-col gap-3">
      <h2 id="insights-heading" className="sr-only">
        Insights
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <OutcomeBadge outcome={byType.outcome} open={open} />
        {consensus && <Badge variant="outline">{CONSENSUS_LABEL[consensus]}</Badge>}
      </div>
      {name ? (
        <div className="flex flex-col gap-2 border-l-4 border-signal pl-4">
          <p className="font-display max-w-[30ch] text-[1.9rem] leading-[1.05] font-extrabold text-balance break-words sm:text-[2.5rem]">
            {name}
          </p>
          <p className="max-w-[65ch] text-[1.0625rem] text-pretty text-muted-foreground" aria-live="polite">
            {sentence}
          </p>
        </div>
      ) : (
        <p
          className="font-display max-w-[34ch] text-[1.5rem] leading-[1.15] font-bold text-balance break-words sm:text-[1.9rem]"
          aria-live="polite"
        >
          {sentence}
        </p>
      )}
      {polarized.length > 0 && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <SplitIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          Opinions split on {formatList(polarized)}: many rated {polarized.length === 1 ? "it" : "them"} very low and many very high.
        </p>
      )}
    </section>
  );
}

type InsightsStatsProps = { insights: PollInsights; closesAt: Date | null; now: Date };

/** The numbers behind the headline, as a compact rail. */
export function InsightsStats({ insights, closesAt, now }: InsightsStatsProps) {
  const { common } = insights;
  const open = common.status !== "CLOSED";
  const lead = leadStat(insights);
  const rate = common.responseRate;

  return (
    <dl className="panel divide-y overflow-hidden">
      <StatTile
        label="Responses"
        value={common.totalResponses}
        detail={common.lastResponseAt ? `Last ${formatRelative(common.lastResponseAt, now)}` : "None yet"}
      />
      {rate ? (
        <StatTile
          label="Response rate"
          value={`${rate.percent}%`}
          detail={
            rate.exceedsExpected
              ? `More than the ${common.expectedParticipants} expected`
              : `${common.totalResponses} of ${common.expectedParticipants} expected`
          }
        >
          <Meter value={rate.ringValue} label="Response rate" className="mt-1" />
        </StatTile>
      ) : (
        // Without an expected count there's no rate to show; comments are the next most useful number.
        <StatTile label="Comments" value={common.comments.length} detail={common.comments.length ? "See below" : "None yet"} />
      )}
      <StatTile label="Lead" value={lead.value} detail={lead.detail} />
      <StatTile
        label="Status"
        value={<span className="text-xl">{open ? "Open" : "Closed"}</span>}
        detail={
          open
            ? closesAt
              ? `Closes ${formatRelative(closesAt, now)}`
              : "No deadline"
            : `Closed ${formatRelative(common.closedAt!, now)}`
        }
      />
    </dl>
  );
}
