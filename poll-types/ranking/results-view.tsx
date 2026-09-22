import { RowBadge } from "@/components/insights/row-badge";
import { TallyRow } from "@/components/insights/tally";
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
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {sorted.map((option, index) => {
          const isTop = highlighted.has(option.optionId);
          return (
            <li key={option.optionId} className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2 gap-y-1">
              <span className="font-display flex h-11 items-center justify-center text-lg font-bold text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <TallyRow
                index={index}
                max={maxPoints}
                label={
                  <span className="flex flex-wrap items-center gap-2">
                    {option.label}
                    {isTop && outcome.kind === "LEADER" && <RowBadge>{open ? "Leading" : "Winner"}</RowBadge>}
                  </span>
                }
                value={plural(option.points, "pt")}
                segments={[{ value: option.points, label: option.label, tone: !emphasise ? "soft" : isTop ? "signal" : "rest" }]}
              />
              <span className="col-start-2 px-0.5 text-xs text-muted-foreground">
                {option.averageRank === null
                  ? "Not ranked yet"
                  : `Average rank ${option.averageRank} · first choice for ${option.firstChoices}`}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted-foreground">
        A #1 ranking earns {plural(ballotSize, "point")}, #2 earns {Math.max(ballotSize - 1, 0)}, and so on.
      </p>
    </div>
  );
}
