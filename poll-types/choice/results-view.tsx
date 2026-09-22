import { RowBadge } from "@/components/insights/row-badge";
import { TallyRow } from "@/components/insights/tally";
import { formatPercent, plural } from "@/lib/insights/outcome";
import type { ResultsViewProps } from "../results-view-types";
import type { ChoiceInsights } from "./insights";

/** Sorted tally. Emphasis form: the leader (or tied leaders) in the signal colour, the rest grey. */
export function ChoiceResultsView({ insights, totalResponses, open }: ResultsViewProps<ChoiceInsights>) {
  const { options, outcome, multi } = insights;
  const highlighted = new Set(
    outcome.kind === "LEADER"
      ? [outcome.leader.optionId]
      : outcome.kind === "TIE"
        ? outcome.tied.map((option) => option.optionId)
        : [],
  );
  // With no clear leader yet, every bar gets the same, quieter colour.
  const emphasise = highlighted.size > 0;
  const sorted = [...options].sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-2">
        {sorted.map((option, index) => {
          const isTop = highlighted.has(option.optionId);
          return (
            <li key={option.optionId}>
              <TallyRow
                index={index}
                max={totalResponses}
                label={
                  <span className="flex flex-wrap items-center gap-2">
                    {option.label}
                    {isTop && outcome.kind === "LEADER" && <RowBadge>{open ? "Leading" : "Winner"}</RowBadge>}
                  </span>
                }
                value={`${plural(option.count, "vote")} · ${formatPercent(option.share)}`}
                segments={[{ value: option.count, label: option.label, tone: !emphasise ? "soft" : isTop ? "signal" : "rest" }]}
              />
            </li>
          );
        })}
      </ol>
      {multi && (
        <p className="text-xs text-muted-foreground">
          Voters could pick more than one option, so percentages add up to more than 100%.
        </p>
      )}
    </div>
  );
}
