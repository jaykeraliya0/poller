import { SplitIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ResultBar } from "@/components/insights/result-bar";
import { plural } from "@/lib/insights/outcome";
import { cn } from "@/lib/utils";
import type { ResultsViewProps } from "../results-view-types";
import type { RatingInsights, RatingOptionResult } from "./insights";

/** Mini column chart of how many gave each score; single hue, with a text equivalent for screen readers. */
function Distribution({ option, scale }: { option: RatingOptionResult; scale: number }) {
  const max = Math.max(...option.distribution, 1);
  return (
    <figure className="flex flex-col gap-1">
      <div className="flex h-8 items-end gap-0.5" aria-hidden>
        {option.distribution.map((count, index) => (
          <div
            key={index}
            title={`${index + 1}: ${plural(count, "rating")}`}
            className={cn("flex-1 rounded-t-[4px] bg-viz-accent-soft", count === 0 && "bg-viz-track")}
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
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        Scale: 1 = {lowLabel}, {scale} = {highLabel}. Bars show the average; columns show how many gave each score.
      </p>
      <ol className="flex flex-col gap-5">
        {sorted.map((option) => {
          const isTop = highlighted.has(option.optionId);
          return (
            <li key={option.optionId} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="break-words">{option.label}</span>
                  {isTop && outcome.kind === "LEADER" && <Badge>{open ? "Top rated" : "Winner"}</Badge>}
                  {option.polarized && (
                    <Badge variant="outline">
                      <SplitIcon aria-hidden /> Split opinions
                    </Badge>
                  )}
                </span>
                <span className="shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                  {option.mean === null ? "No ratings" : `${option.mean} / ${scale}`}
                  <span className="block text-xs">{plural(option.count, "rating")}</span>
                </span>
              </div>
              <ResultBar
                max={scale}
                segments={[
                  { value: option.mean ?? 0, label: `${option.label} average`, className: !emphasise || isTop ? "bg-viz-accent" : "bg-viz-rest" },
                ]}
              />
              {option.count > 0 && <Distribution option={option} scale={scale} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
