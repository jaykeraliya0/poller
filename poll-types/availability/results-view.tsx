import { RowBadge } from "@/components/insights/row-badge";
import { TallyLegend, TallyRow } from "@/components/insights/tally";
import { formatTime } from "@/lib/datetime";
import type { ResultsViewProps } from "../results-view-types";
import type { AvailabilityInsights } from "./insights";

/** Per-slot stacked tallies (yes, then if-need-be) grouped by day; best slot flagged. */
export function AvailabilityResultsView({ insights, totalResponses }: ResultsViewProps<AvailabilityInsights>) {
  const { slots, days, outcome, timezone } = insights;
  const best = new Set(
    outcome.kind === "LEADER"
      ? [outcome.leader.optionId]
      : outcome.kind === "TIE"
        ? outcome.tied.map((slot) => slot.optionId)
        : [],
  );
  const byId = new Map(slots.map((slot) => [slot.optionId, slot]));
  let row = 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <TallyLegend
          items={[
            { label: "Yes", tone: "signal" },
            { label: "If need be", tone: "soft" },
            { label: "No / no answer", tone: "track" },
          ]}
        />
        <p className="text-xs text-muted-foreground">Times in {timezone.replaceAll("_", " ")}.</p>
      </div>
      {days.map((day) => (
        <section key={day.key} aria-labelledby={`results-day-${day.key}`} className="grid gap-2 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-4">
          <h3 id={`results-day-${day.key}`} className="font-display pt-2.5 text-[0.95rem] font-semibold">
            {day.label}
          </h3>
          <ul className="flex flex-col gap-2">
            {day.slotIds.map((id) => {
              const slot = byId.get(id)!;
              return (
                <li key={id} className="flex flex-col gap-1">
                  <TallyRow
                    index={row++}
                    max={totalResponses}
                    label={
                      <span className="flex flex-wrap items-center gap-2 tabular-nums">
                        {formatTime(slot.startsAt, timezone)} – {formatTime(slot.endsAt, timezone)}
                        {best.has(id) && <RowBadge>{outcome.kind === "TIE" ? "Joint best" : "Best time"}</RowBadge>}
                      </span>
                    }
                    value={`${slot.yes} yes${slot.maybe > 0 ? ` · ${slot.maybe} if need be` : ""}`}
                    segments={[
                      { value: slot.yes, label: "Yes", tone: "signal" },
                      { value: slot.maybe, label: "If need be", tone: "soft" },
                    ]}
                  />
                  {slot.unanswered > 0 && (
                    <span className="px-0.5 text-xs text-muted-foreground">{slot.unanswered} voted before this was added</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
