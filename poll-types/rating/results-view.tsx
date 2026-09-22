import { SplitIcon } from "lucide-react";
import { RowBadge } from "@/components/insights/row-badge";
import { TallyRow } from "@/components/insights/tally";
import { plural } from "@/lib/insights/outcome";
import { cn } from "@/lib/utils";
import type { ResultsViewProps } from "../results-view-types";
import type { RatingInsights, RatingOptionResult } from "./insights";

/** Mini column chart of how many gave each score; single hue, with a text equivalent for screen readers. */
function Distribution({ option, scale }: { option: RatingOptionResult; scale: number }) {
  const max = Math.max(...option.distribution, 1);
  return (
    <figure className="flex h-11 flex-col justify-end gap-1">
      <div className="flex h-8 items-end gap-[3px]" aria-hidden>
        {option.distribution.map((count, index) => (
          <div
            key={index}
            title={`${index + 1}: ${plural(count, "rating")}`}
            className={cn("flex-1 rounded-[2px] bg-viz-accent-soft", count === 0 && "bg-viz-track")}
            style={{ height: count === 0 ? 2 : `${(count / max) * 100}%` }}
          />
        ))}
      </div>
      <figcaption className="sr-only">
        Ratings: {option.distribution.map((count, index) => `${index + 1}: ${count}`).join(", ")} out of {scale}.
      </figcaption>
    </figure>
  );
}

export function RatingResultsView({ insights, open }: ResultsViewProps<RatingInsights>) {
  const { options, outcome, scale, lowLabel, highLabel } = insights;
  const highlighted = new Set(
    outcome.kind === "LEADER" ? [outcome.leader.optionId] : outcome.kind === "TIE" ? outcome.tied.map((o) => o.optionId) : [],
  );
  const emphasise = highlighted.size > 0;
  const sorted = [...options].sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {sorted.map((option, index) => {
          const isTop = highlighted.has(option.optionId);
          return (
            <li key={option.optionId} className="grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_7.5rem]">
              <TallyRow
                index={index}
                max={scale}
                label={
                  <span className="flex flex-wrap items-center gap-2">
                    {option.label}
                    {isTop && outcome.kind === "LEADER" && <RowBadge>{open ? "Top rated" : "Winner"}</RowBadge>}
                    {option.polarized && (
                      <RowBadge tone="neutral">
                        <SplitIcon aria-hidden /> Split opinions
                      </RowBadge>
                    )}
                  </span>
                }
                value={option.mean === null ? "No ratings" : `${option.mean} / ${scale}`}
                segments={[
                  { value: option.mean ?? 0, label: `${option.label} average`, tone: !emphasise ? "soft" : isTop ? "signal" : "rest" },
                ]}
              />
              <div className="hidden sm:block">{option.count > 0 && <Distribution option={option} scale={scale} />}</div>
              <span className="px-0.5 text-xs text-muted-foreground sm:col-span-2">{plural(option.count, "rating")}</span>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted-foreground">
        Scale: 1 = {lowLabel}, {scale} = {highLabel}. Bars show the average; columns show how many gave each score.
      </p>
    </div>
  );
}
