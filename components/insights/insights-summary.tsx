import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/datetime";
import type { PollInsights } from "@/lib/insights";
import { MIN_RESPONSES_FOR_OUTCOME, plural, type Consensus } from "@/lib/insights/outcome";
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

  if (byType.kind === "CHOICE") {
    const runnerUp = byType.options.find((option) => option.optionId === outcome.runnerUp!.optionId)!;
    return { value: `+${outcome.margin}`, detail: `${plural(outcome.margin, "vote")} ahead of ${runnerUp.label}` };
  }
  const leader = byType.slots.find((slot) => slot.optionId === outcome.leader.optionId)!;
  const runnerUp = byType.slots.find((slot) => slot.optionId === outcome.runnerUp!.optionId)!;
  const morePeople = leader.yes - runnerUp.yes;
  return morePeople > 0
    ? { value: `+${morePeople}`, detail: `${morePeople === 1 ? "person" : "people"} more than ${runnerUp.shortLabel}` }
    : { value: `+${leader.maybe - runnerUp.maybe}`, detail: `more "if need be" than ${runnerUp.shortLabel}` };
}

type InsightsSummaryProps = { insights: PollInsights; closesAt: Date | null; now: Date };

export function InsightsSummary({ insights, closesAt, now }: InsightsSummaryProps) {
  const { common, byType } = insights;
  const open = common.status !== "CLOSED";
  const lead = leadStat(insights);
  const consensus = byType.kind === "CHOICE" && common.hasEnoughData ? byType.consensus : null;
  const rate = common.responseRate;

  return (
    <section aria-labelledby="insights-heading" className="flex flex-col gap-3">
      <h2 id="insights-heading" className="sr-only">
        Insights
      </h2>
      <div className="flex flex-col gap-3 rounded-3xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <OutcomeBadge outcome={byType.outcome} open={open} />
          {consensus && <Badge variant="outline">{CONSENSUS_LABEL[consensus]}</Badge>}
        </div>
        <p className="text-lg font-semibold text-balance break-words" aria-live="polite">
          {byType.headline ?? fallbackHeadline(insights)}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
            <Meter value={rate.ringValue} label="Response rate" />
          </StatTile>
        ) : (
          // Without an expected count there's no rate to show; comments are the next most useful number.
          <StatTile
            label="Comments"
            value={common.comments.length}
            detail={common.comments.length ? "See below" : "None yet"}
          />
        )}
        <StatTile label="Lead" value={lead.value} detail={lead.detail} />
        <StatTile
          label="Status"
          value={open ? "Open" : "Closed"}
          detail={
            open
              ? closesAt
                ? `Closes ${formatRelative(closesAt, now)}`
                : "No deadline"
              : `Closed ${formatRelative(common.closedAt!, now)}`
          }
        />
      </dl>
    </section>
  );
}
