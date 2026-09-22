import { Badge } from "@/components/ui/badge";
import { ResultBar } from "@/components/insights/result-bar";
import { formatTime } from "@/lib/datetime";
import type { ResultsViewProps } from "../results-view-types";
import type { AvailabilityInsights } from "./insights";

function Legend() {
  const items = [
    { label: "Yes", className: "bg-viz-accent" },
    { label: "If need be", className: "bg-viz-accent-soft" },
    { label: "No / no answer", className: "bg-viz-track border" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className={`size-2.5 rounded-sm ${item.className}`} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Per-slot stacked bars (yes, then if-need-be) grouped by day; best slot flagged. */
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Legend />
        <p className="text-xs text-muted-foreground">Times in {timezone.replaceAll("_", " ")}.</p>
      </div>
      {days.map((day) => (
        <section key={day.key} aria-labelledby={`results-day-${day.key}`} className="flex flex-col gap-3">
          <h3 id={`results-day-${day.key}`} className="text-sm font-medium">
            {day.label}
          </h3>
          <ul className="flex flex-col gap-4">
            {day.slotIds.map((id) => {
              const slot = byId.get(id)!;
              return (
                <li key={id} className="flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="tabular-nums">
                        {formatTime(slot.startsAt, timezone)} – {formatTime(slot.endsAt, timezone)}
                      </span>
                      {best.has(id) && <Badge>{outcome.kind === "TIE" ? "Joint best" : "Best time"}</Badge>}
                    </span>
                    <span className="shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                      {slot.yes} yes{slot.maybe > 0 && ` · ${slot.maybe} if need be`}
                      {slot.unanswered > 0 && (
                        <span className="block text-xs">{slot.unanswered} voted before this was added</span>
                      )}
                    </span>
                  </div>
                  <ResultBar
                    max={totalResponses}
                    segments={[
                      { value: slot.yes, label: "Yes", className: "bg-viz-accent" },
                      { value: slot.maybe, label: "If need be", className: "bg-viz-accent-soft" },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
