import { Text, View } from "@react-pdf/renderer";
import { formatPercent, plural } from "@/lib/insights/outcome";
import { resultBars } from "@/lib/insights/summary";
import type { AvailabilityInsights } from "@/poll-types/availability/insights";
import type { ChoiceInsights } from "@/poll-types/choice/insights";
import type { RankingInsights } from "@/poll-types/ranking/insights";
import type { RatingInsights } from "@/poll-types/rating/insights";
import type { PollExport } from "../data";
import {
  ColumnChart,
  CommentsSection,
  HeatTable,
  LineChart,
  ReportDocument,
  ResultsSection,
  Section,
  StatRow,
  Verdict,
  formatDayKey,
  summaryStats,
  type HeatRow,
} from "./components";
import { SERIES, color, styles } from "./theme";

const MAX_RANK_COLUMNS = 6;

/** Same folding as the results page: past six ranks the tail becomes one "#6+" column. */
function rankColumns(ballotSize: number) {
  const shown = ballotSize > MAX_RANK_COLUMNS ? MAX_RANK_COLUMNS - 1 : ballotSize;
  const columns = Array.from({ length: shown }, (_, r) => ({ label: `#${r + 1}`, from: r, to: r }));
  if (shown < ballotSize) columns.push({ label: `#${shown + 1}+`, from: shown, to: ballotSize - 1 });
  return columns;
}

function Note({ children }: { children: React.ReactNode }) {
  return <Text style={[styles.small, styles.muted, { marginTop: 6 }]}>{children}</Text>;
}

function ChoiceSections({ insights }: { insights: ChoiceInsights }) {
  if (!insights.multi) return null;
  const { picksPerBallot, coPicks } = insights;
  return (
    <>
      {picksPerBallot && picksPerBallot.some(Boolean) && (
        <Section title="Options per voter" note="How many options each voter picked.">
          <ColumnChart values={picksPerBallot} xLabels={picksPerBallot.map((_, i) => plural(i + 1, "pick"))} height={110} />
        </Section>
      )}
      {coPicks && coPicks.options.length >= 2 && (
        <Section title="Picked together" note="Voters who picked both the row and the column option.">
          <HeatTable
            columns={coPicks.options.map((_, j) => String(j + 1))}
            rows={coPicks.options.map((option, i) => {
              const max = Math.max(1, ...coPicks.together.flatMap((row, a) => row.filter((_, b) => a !== b)));
              return {
                label: `${i + 1}. ${option.label}`,
                cells: coPicks.options.map((_, j) =>
                  i === j ? null : { text: String(coPicks.together[i][j]), intensity: coPicks.together[i][j] / max },
                ),
              };
            })}
          />
        </Section>
      )}
    </>
  );
}

function AvailabilitySections({ insights, total }: { insights: AvailabilityInsights; total: number }) {
  const bySlot = new Map(insights.slots.map((slot) => [slot.optionId, slot]));
  const rows: HeatRow[] = insights.days.flatMap((day) =>
    day.slotIds.map((id) => {
      const slot = bySlot.get(id)!;
      const share = (count: number) => (total ? count / total : 0);
      return {
        label: slot.label,
        cells: [
          { text: `${slot.yes} (${formatPercent(share(slot.yes))})`, intensity: share(slot.yes) },
          { text: String(slot.maybe), intensity: share(slot.maybe) * 0.6 },
          { text: String(slot.no), intensity: share(slot.no), tone: "negative" as const },
        ],
      };
    }),
  );
  return (
    <Section
      title="When people are free"
      note={`Every slot, in time order. Stronger colour means more people. Times in ${insights.timezone.replaceAll("_", " ")}.`}
      keepTogether={rows.length <= 14}
    >
      <HeatTable columns={["Yes", "If need be", "No"]} rows={rows} labelWidth={200} />
    </Section>
  );
}

function RankingSections({ insights, total }: { insights: RankingInsights; total: number }) {
  const { rankMatrix, headToHead } = insights;
  const columns = rankColumns(insights.ballotSize);
  return (
    <>
      <Section title="Rank breakdown" note="How many voters put each option in each place.">
        <HeatTable
          columns={columns.map((column) => column.label)}
          rows={rankMatrix.options.map((option, i) => ({
            label: option.label,
            cells: columns.map((column) => {
              const count = rankMatrix.counts[i].slice(column.from, column.to + 1).reduce((sum, value) => sum + value, 0);
              return { text: count ? String(count) : "", intensity: total ? count / total : 0 };
            }),
          }))}
        />
      </Section>
      {headToHead.options.length >= 2 && (
        <Section title="Head to head" note="Of voters who ranked either option, the share who put the row above the column.">
          <HeatTable
            columns={headToHead.options.map((_, j) => String(j + 1))}
            rows={headToHead.options.map((option, i) => ({
              label: `${i + 1}. ${option.label}`,
              cells: headToHead.options.map((_, j) => {
                if (i === j) return null;
                const decided = headToHead.wins[i][j] + headToHead.wins[j][i];
                if (decided === 0) return { text: "", intensity: 0 };
                const share = headToHead.wins[i][j] / decided;
                return {
                  text: formatPercent(share),
                  intensity: Math.abs(share - 0.5) * 2,
                  tone: share > 0.5 ? ("positive" as const) : share < 0.5 ? ("negative" as const) : ("sequential" as const),
                };
              }),
            }))}
          />
          <Note>
            {headToHead.condorcetWinner
              ? `${headToHead.condorcetWinner.label} beats every other option one-on-one.`
              : "No option beats every other one-on-one yet."}{" "}
            Blue: the row is preferred. Orange: the column is preferred.
          </Note>
        </Section>
      )}
    </>
  );
}

function RatingSections({ insights }: { insights: RatingInsights }) {
  const rated = insights.options.filter((option) => option.count > 0);
  if (rated.length === 0) return null;
  const scores = Array.from({ length: insights.scale }, (_, i) => String(i + 1));
  return (
    <>
      <Section title="Sentiment" note={`Share of ratings below, at and above the middle of the 1–${insights.scale} scale.`}>
        <HeatTable
          columns={[`Low (${insights.lowLabel})`, "Neutral", `High (${insights.highLabel})`]}
          rows={rated.map((option) => {
            const share = (count: number) => count / option.count;
            return {
              label: option.label,
              cells: [
                { text: formatPercent(share(option.sentiment.low)), intensity: share(option.sentiment.low), tone: "negative" as const },
                { text: formatPercent(share(option.sentiment.neutral)), intensity: share(option.sentiment.neutral), tone: "neutral" as const },
                { text: formatPercent(share(option.sentiment.high)), intensity: share(option.sentiment.high), tone: "positive" as const },
              ],
            };
          })}
        />
      </Section>
      <Section title="Distribution" note="How many voters gave each score.">
        <HeatTable
          columns={scores}
          rows={rated.map((option) => {
            const max = Math.max(1, ...option.distribution);
            return {
              label: option.label,
              cells: option.distribution.map((count) => ({ text: count ? String(count) : "", intensity: count / max })),
            };
          })}
        />
      </Section>
      <Section title="Average and spread" note="A small spread means voters agree on the score.">
        <View>
          <View style={{ flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: color.muted, paddingBottom: 3 }}>
            {["Option", "Average", "Median", "Spread (SD)", "Ratings"].map((heading, i) => (
              <Text key={heading} style={[styles.small, styles.bold, i === 0 ? { flex: 1 } : { width: 70, textAlign: "right" }]}>
                {heading}
              </Text>
            ))}
          </View>
          {rated.map((option) => (
            <View key={option.optionId} style={{ flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: color.line }}>
              <Text style={{ flex: 1 }}>
                {option.label}
                {option.polarized ? "  (opinions split)" : ""}
              </Text>
              {[option.mean, option.median, option.standardDeviation, option.count].map((value, i) => (
                <Text key={i} style={{ width: 70, textAlign: "right" }}>
                  {value ?? "–"}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </Section>
    </>
  );
}

/** The analysis board on paper: trends, turnout and each poll type's own breakdowns. */
export function AnalyticsReport({ data }: { data: PollExport }) {
  const { insights } = data;
  const { common, byType, trends } = insights;
  const total = common.totalResponses;
  const { standings, turnout } = trends;
  const formatMetric = (value: number) => (standings.metric.unit === "percent" ? `${Math.round(value)}%` : String(Math.round(value * 10) / 10));

  return (
    <ReportDocument data={data} kind="Analytics report">
      <Verdict insights={insights} />
      <StatRow stats={summaryStats(data)} />

      <ResultsSection result={resultBars(insights)} />

      {total === 0 ? (
        <Section title="Analysis">
          <Text style={styles.muted}>No votes yet, so there&apos;s nothing to analyse.</Text>
        </Section>
      ) : (
        <>
          <Section
            title="Standings over time"
            note={`${standings.metric.label}, by the end of each day with votes.${standings.hidden ? ` ${plural(standings.hidden, "more option")} not shown.` : ""}`}
          >
            {standings.points.length >= 2 ? (
              <LineChart
                series={standings.series.map((item, i) => ({
                  label: item.label,
                  fill: SERIES[i % SERIES.length],
                  values: standings.points.map((point) => point.values[item.optionId] ?? null),
                }))}
                xLabels={standings.points.map((point) => formatDayKey(point.day))}
                max={standings.metric.max}
                format={formatMetric}
              />
            ) : (
              <Text style={styles.muted}>All votes so far came in on one day, so there&apos;s no trend to draw yet.</Text>
            )}
          </Section>

          <Section title="Turnout" note="Total responses by the end of each day.">
            <LineChart
              series={[{ label: "Responses", fill: color.signal, values: turnout.map((point) => point.total) }]}
              xLabels={turnout.map((point) => formatDayKey(point.day))}
              max={Math.max(total, common.expectedParticipants ?? 0, 1)}
              format={(value) => String(Math.round(value))}
              height={120}
            />
          </Section>

          <Section title="New responses per day">
            <ColumnChart values={common.timeline.map((day) => day.count)} xLabels={common.timeline.map((day) => formatDayKey(day.day))} height={110} />
          </Section>

          {byType.kind === "CHOICE" && <ChoiceSections insights={byType} />}
          {byType.kind === "AVAILABILITY" && <AvailabilitySections insights={byType} total={total} />}
          {byType.kind === "RANKING" && <RankingSections insights={byType} total={total} />}
          {byType.kind === "RATING" && <RatingSections insights={byType} />}

          <CommentsSection title="What people said" insights={insights} limit={10} />
        </>
      )}
    </ReportDocument>
  );
}
