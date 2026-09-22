import { TrophyIcon } from "lucide-react";
import { BoardSection } from "@/components/insights/board-section";
import { Heatmap, HeatmapScale, heatmapSpan } from "@/components/insights/analysis/heatmap";
import { TallyLegend } from "@/components/insights/tally";
import { formatPercent, plural } from "@/lib/insights/outcome";
import type { RankingInsights } from "./insights";

/** Rank columns before the tail folds into one "#6+" column. */
const MAX_RANK_COLUMNS = 6;

/** Rank columns to draw, folding long ballots' tail so the grid stays readable. */
function rankColumns(ballotSize: number): { label: string; from: number; to: number }[] {
  const shown = ballotSize > MAX_RANK_COLUMNS ? MAX_RANK_COLUMNS - 1 : ballotSize;
  const columns = Array.from({ length: shown }, (_, r) => ({ label: `#${r + 1}`, from: r, to: r }));
  if (shown < ballotSize) columns.push({ label: `#${shown + 1}+`, from: shown, to: ballotSize - 1 });
  return columns;
}

function RankGrid({ insights, totalResponses }: { insights: RankingInsights; totalResponses: number }) {
  const { options, counts } = insights.rankMatrix;
  const columns = rankColumns(insights.ballotSize);
  return (
    <Heatmap
      caption="How many voters put each option at each rank"
      columns={columns.map((column) => ({ key: column.label, label: column.label }))}
      rows={options.map((option, i) => ({
        key: option.optionId,
        label: option.label,
        cells: columns.map((column) => {
          const count = counts[i].slice(column.from, column.to + 1).reduce((sum, value) => sum + value, 0);
          return {
            text: count ? String(count) : "",
            intensity: totalResponses ? count / totalResponses : 0,
            description: `${plural(count, "voter")} ranked ${option.label} ${column.label}`,
          };
        }),
      }))}
    />
  );
}

function HeadToHeadGrid({ headToHead }: { headToHead: RankingInsights["headToHead"] }) {
  const { options, wins } = headToHead;
  return (
    <Heatmap
      caption="Share of voters who ranked the row option above the column option"
      columns={options.map((option, j) => ({ key: option.optionId, label: j + 1, title: option.label }))}
      rows={options.map((option, i) => ({
        key: option.optionId,
        label: `${i + 1}. ${option.label}`,
        cells: options.map((other, j) => {
          if (i === j) return null;
          const decided = wins[i][j] + wins[j][i];
          if (decided === 0) {
            return { text: "", intensity: 0, description: `Nobody has ranked ${option.label} or ${other.label} yet` };
          }
          const share = wins[i][j] / decided;
          return {
            text: formatPercent(share),
            intensity: Math.abs(share - 0.5) * 2,
            tone: share > 0.5 ? "positive" : share < 0.5 ? "negative" : "sequential",
            description: `${formatPercent(share)} preferred ${option.label} over ${other.label} (${wins[i][j]} of ${decided})`,
          };
        }),
      }))}
    />
  );
}

export function RankingAnalysisView({ insights, totalResponses }: { insights: RankingInsights; totalResponses: number }) {
  const { headToHead } = insights;
  const showHeadToHead = headToHead.options.length >= 2;
  // The two grids pair up only when both fit half the board; otherwise both span it.
  const span =
    heatmapSpan(rankColumns(insights.ballotSize).length) ?? (showHeadToHead ? heatmapSpan(headToHead.options.length) : "xl:col-span-2");
  return (
    <>
      <BoardSection
        id="analysis-ranks-heading"
        title="Rank breakdown"
        description="How many voters put each option in each place. Stronger colour means more voters."
        className={span}
      >
        <RankGrid insights={insights} totalResponses={totalResponses} />
        <HeatmapScale low="Few" high="Many" />
      </BoardSection>

      {showHeadToHead && (
        <BoardSection
          id="analysis-h2h-heading"
          title="Head to head"
          description="Of voters who ranked either option, the share who put the row above the column."
          className={span}
        >
          <HeadToHeadGrid headToHead={headToHead} />
          <TallyLegend
            items={[
              { label: "Row preferred", tone: "signal" },
              { label: "Column preferred", tone: "negative" },
            ]}
          />
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            {headToHead.condorcetWinner ? (
              <>
                <TrophyIcon className="mt-0.5 size-4 shrink-0 text-signal-ink" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">{headToHead.condorcetWinner.label}</span> beats every other
                  option one-on-one.
                </span>
              </>
            ) : (
              "No option beats every other one-on-one yet."
            )}
          </p>
        </BoardSection>
      )}
    </>
  );
}
