import { BoardSection } from "@/components/insights/board-section";
import { PicksHistogram, ShareDonut, type ShareSlice } from "@/components/insights/analysis/choice-charts";
import { Heatmap, HeatmapScale, heatmapSpan } from "@/components/insights/analysis/heatmap";
import { seriesColor } from "@/components/insights/analysis/series";
import { formatPercent, plural } from "@/lib/insights/outcome";
import type { ChoiceInsights } from "./insights";

/** Slices before the tail folds into "Other"; a donut past this stops being a glance. */
const MAX_SLICES = 5;

function shareSlices(insights: ChoiceInsights): ShareSlice[] {
  // Same order as the standings chart, so each option keeps its colour across both.
  const ranked = [...insights.options].sort((a, b) => b.score - a.score).filter((option) => option.count > 0);
  const head = ranked.length > MAX_SLICES + 1 ? ranked.slice(0, MAX_SLICES) : ranked;
  const slices = head.map((option, i) => ({ key: `o${i}`, label: option.label, count: option.count, color: seriesColor(i) }));
  const rest = ranked.slice(head.length).reduce((sum, option) => sum + option.count, 0);
  if (rest > 0) slices.push({ key: "other", label: `Other (${ranked.length - head.length})`, count: rest, color: "var(--viz-rest)" });
  return slices;
}

function CoPickGrid({ coPicks }: { coPicks: NonNullable<ChoiceInsights["coPicks"]> }) {
  const { options, together } = coPicks;
  let max = 0;
  together.forEach((row, i) => row.forEach((count, j) => i !== j && (max = Math.max(max, count))));

  return (
    <Heatmap
      caption="How many voters picked each pair of options together"
      columns={options.map((option, j) => ({ key: option.optionId, label: j + 1, title: option.label }))}
      rows={options.map((option, i) => ({
        key: option.optionId,
        label: `${i + 1}. ${option.label}`,
        cells: options.map((other, j) => {
          if (i === j) return null;
          const both = together[i][j];
          const ofRow = option.count ? ` (${formatPercent(both / option.count)} of ${option.label} voters)` : "";
          return {
            text: String(both),
            intensity: max ? both / max : 0,
            description: `${plural(both, "voter")} picked both ${option.label} and ${other.label}${ofRow}`,
          };
        }),
      }))}
    />
  );
}

export function ChoiceAnalysisView({ insights, totalResponses }: { insights: ChoiceInsights; totalResponses: number }) {
  if (!insights.multi) {
    const slices = shareSlices(insights);
    if (slices.length < 2) return null;
    return (
      <BoardSection id="analysis-share-heading" title="Vote share" description="Each option's slice of all votes." className="xl:col-span-2">
        <ShareDonut slices={slices} total={totalResponses} />
      </BoardSection>
    );
  }

  const { picksPerBallot, coPicks } = insights;
  const showCoPicks = coPicks && coPicks.options.filter((option) => option.count > 0).length >= 2;
  // Side by side when the grid fits half the board; otherwise both span it.
  const span = showCoPicks ? heatmapSpan(coPicks.options.length) : "xl:col-span-2";
  return (
    <>
      {picksPerBallot && (
        <BoardSection
          id="analysis-picks-heading"
          title="Options per voter"
          description="How many options each voter picked."
          className={span}
        >
          <PicksHistogram picksPerBallot={picksPerBallot} />
        </BoardSection>
      )}
      {showCoPicks && (
        <BoardSection
          id="analysis-copicks-heading"
          title="Picked together"
          description="Voters who picked both the row and the column option. Stronger colour means more overlap."
          className={span}
        >
          <CoPickGrid coPicks={coPicks} />
          <HeatmapScale low="Rarely together" high="Often together" />
        </BoardSection>
      )}
    </>
  );
}
