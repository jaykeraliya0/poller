import { Badge } from "@/components/ui/badge";
import { ResultBar } from "@/components/insights/result-bar";
import { plural } from "@/lib/insights/outcome";
import type { ResultsViewProps } from "../results-view-types";
import type { RankingInsights } from "./insights";

/** Options by Borda points, leader emphasised; bars on the maximum possible points. */
export function RankingResultsView({ insights, totalResponses, open }: ResultsViewProps<RankingInsights>) {
  const { options, outcome, ballotSize } = insights;
  const highlighted = new Set(
    outcome.kind === "LEADER" ? [outcome.leader.optionId] : outcome.kind === "TIE" ? outcome.tied.map((o) => o.optionId) : [],
  );
  const emphasise = highlighted.size > 0;
  const maxPoints = ballotSize * totalResponses;
  const sorted = [...options].sort((a, b) => b.points - a.points);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        A #1 ranking earns {plural(ballotSize, "point")}, #2 earns {Math.max(ballotSize - 1, 0)}, and so on.
      </p>
      <ol className="flex flex-col gap-4">
        {sorted.map((option, index) => {
          const isTop = highlighted.has(option.optionId);
          return (
            <li key={option.optionId} className="flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="w-5 shrink-0 text-sm text-muted-foreground tabular-nums">{index + 1}.</span>
                  <span className="break-words">{option.label}</span>
                  {isTop && outcome.kind === "LEADER" && <Badge>{open ? "Leading" : "Winner"}</Badge>}
                </span>
                <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{plural(option.points, "pt")}</span>
              </div>
              <ResultBar
                max={maxPoints}
                segments={[
                  { value: option.points, label: option.label, className: !emphasise || isTop ? "bg-viz-accent" : "bg-viz-rest" },
                ]}
              />
              <span className="text-xs text-muted-foreground">
                {option.averageRank === null
                  ? "Not ranked yet"
                  : `Average rank ${option.averageRank} · first choice for ${option.firstChoices}`}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
