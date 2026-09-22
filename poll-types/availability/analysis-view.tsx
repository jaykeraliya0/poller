import { BoardSection } from "@/components/insights/board-section";
import { HeatmapScale, sequentialFill } from "@/components/insights/analysis/heatmap";
import { formatTime } from "@/lib/datetime";
import { formatPercent, plural } from "@/lib/insights/outcome";
import type { AvailabilityInsights } from "./insights";

/**
 * A calendar heatmap: one row per day, one tile per slot, darker where more
 * people said yes. Slots rarely share times across days, so tiles flow in
 * time order rather than sitting in a mostly empty day × time grid.
 */
export function AvailabilityAnalysisView({ insights, totalResponses }: { insights: AvailabilityInsights; totalResponses: number }) {
  const { days, slots, timezone } = insights;
  // A single day is already the tally on the results board.
  if (days.length < 2 || totalResponses === 0) return null;
  const byId = new Map(slots.map((slot) => [slot.optionId, slot]));

  return (
    <BoardSection
      id="analysis-heatmap-heading"
      title="When people are free"
      description={`Stronger colour means more people said yes. Times in ${timezone.replaceAll("_", " ")}.`}
      className="xl:col-span-2"
    >
      <dl className="flex flex-col gap-3">
        {days.map((day) => (
          <div key={day.key} className="grid gap-1.5 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-3">
            <dt className="text-xs font-medium sm:pt-2.5">{day.label}</dt>
            <dd>
              <ul className="flex flex-wrap gap-1">
                {day.slotIds.map((id) => {
                  const slot = byId.get(id)!;
                  const share = slot.yes / totalResponses;
                  const time = `${formatTime(slot.startsAt, timezone)}–${formatTime(slot.endsAt, timezone)}`;
                  const description = `${time}: ${plural(slot.yes, "yes", "yes")} (${formatPercent(share)}), ${slot.maybe} if need be`;
                  return (
                    <li
                      key={id}
                      title={description}
                      className="flex min-w-[5.5rem] flex-col rounded-[6px] px-2 py-1.5 text-xs leading-tight text-foreground tabular-nums"
                      style={{ background: sequentialFill(share) }}
                    >
                      <span className="sr-only">{description}</span>
                      <span aria-hidden className="font-medium">{time}</span>
                      <span aria-hidden>
                        {formatPercent(share)} yes
                      </span>
                    </li>
                  );
                })}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
      <HeatmapScale low="Nobody" high="Everyone" />
    </BoardSection>
  );
}
