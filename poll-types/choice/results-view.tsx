import { Badge } from "@/components/ui/badge";
import { ResultBar } from "@/components/insights/result-bar";
import { formatPercent, plural } from "@/lib/insights/outcome";
import type { ResultsViewProps } from "../results-view-types";
import type { ChoiceInsights } from "./insights";

/** Sorted bar list. Emphasis form: the leader (or tied leaders) in the accent, the rest grey. */
export function ChoiceResultsView({ insights, totalResponses, open }: ResultsViewProps<ChoiceInsights>) {
  const { options, outcome, multi } = insights;
  const highlighted = new Set(
    outcome.kind === "LEADER"
      ? [outcome.leader.optionId]
      : outcome.kind === "TIE"
        ? outcome.tied.map((option) => option.optionId)
        : [],
  );
  // With no clear leader yet, every bar gets the same colour.
  const emphasise = highlighted.size > 0;
  const sorted = [...options].sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-col gap-4">
      {multi && (
        <p className="text-xs text-muted-foreground">
          Voters could pick more than one option, so percentages add up to more than 100%.
        </p>
      )}
      <ol className="flex flex-col gap-4">
        {sorted.map((option) => {
          const isTop = highlighted.has(option.optionId);
          return (
            <li key={option.optionId} className="flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="break-words">{option.label}</span>
                  {isTop && outcome.kind === "LEADER" && <Badge>{open ? "Leading" : "Winner"}</Badge>}
                </span>
                <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                  {plural(option.count, "vote")} · {formatPercent(option.share)}
                </span>
              </div>
              <ResultBar
                max={totalResponses}
                segments={[
                  {
                    value: option.count,
                    label: option.label,
                    className: !emphasise || isTop ? "bg-viz-accent" : "bg-viz-rest",
                  },
                ]}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
