import { Circle, Document, G, Line, Page, Polyline, Rect, Svg, Text, View } from "@react-pdf/renderer";
import type { PollInsights } from "@/lib/insights";
import { formatPercent, plural } from "@/lib/insights/outcome";
import { CONSENSUS_LABEL, headlineSentence, outcomeLabel, verdictName, type ResultBars } from "@/lib/insights/summary";
import { formatList } from "@/lib/insights/outcome";
import type { PollExport } from "../data";
import { color, heatFill, styles, type CellTone } from "./theme";

/** Usable width of an A4 page inside the margins. */
export const CONTENT_WIDTH = 595 - 44 * 2;

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});
export const formatDate = (date: Date) => dateFormat.format(date);
export const formatDateTime = (date: Date) => dateTimeFormat.format(date);
/** "2026-09-14" → "14 Sep" */
export const formatDayKey = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

function statusLine({ poll, insights, generatedAt }: PollExport): string {
  const closedAt = insights.common.closedAt;
  if (closedAt) return `Closed ${formatDate(closedAt)}`;
  if (poll.closesAt) return `Open, closes ${formatDate(poll.closesAt)}`;
  return `Open as of ${formatDate(generatedAt)}`;
}

/** Page frame shared by every report: header on page one, footer with page numbers on all. */
export function ReportDocument({ data, kind, children }: { data: PollExport; kind: string; children: React.ReactNode }) {
  const { poll, typeLabel, insights, generatedAt, url } = data;
  const { totalResponses, expectedParticipants } = insights.common;
  return (
    <Document title={`${poll.title} · ${kind}`} author={poll.creator.name} creator="Poller" producer="Poller">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.body}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.brand}>Poller</Text>
          <Text style={styles.kicker}>{kind}</Text>
        </View>
        <Text style={styles.title}>{poll.title}</Text>
        {poll.description && <Text style={styles.description}>{poll.description}</Text>}
        <Text style={styles.meta}>
          {[
            typeLabel,
            statusLine(data),
            `${plural(totalResponses, "response")}${expectedParticipants ? ` of ${expectedParticipants} expected` : ""}`,
            poll.isAnonymous ? "Anonymous" : null,
            poll.visibility === "PRIVATE" ? "Private" : null,
            poll.archivedAt ? "Archived" : null,
          ]
            .filter(Boolean)
            .join("  ·  ")}
        </Text>
        {children}
        </View>
        <View style={styles.footer} fixed>
          <Rule />
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 6 }}>
            <Text>
              {url} · generated {formatDateTime(generatedAt)}
            </Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function Section({
  title,
  note,
  children,
  keepTogether = true,
  lead,
}: {
  title: string;
  note?: string;
  children?: React.ReactNode;
  /** Small charts shouldn't split across pages; long lists should. */
  keepTogether?: boolean;
  /** For lists: the first item (and any column headings), kept on the same page as the title. */
  lead?: React.ReactNode;
}) {
  return (
    <View style={styles.section} wrap={!keepTogether}>
      {/* The title never ends a page on its own: it moves with its note and the list's first item. */}
      <View wrap={false}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {note ? <Text style={styles.sectionNote}>{note}</Text> : <View style={{ height: 8 }} />}
        {lead}
      </View>
      {children}
    </View>
  );
}

/** A section for a long list: it may run over pages, but the title always sits with the first rows. */
export function ListSection({
  title,
  note,
  head,
  items,
  empty,
  after,
}: {
  title: string;
  note?: string;
  /** Column headings, if any. */
  head?: React.ReactNode;
  items: React.ReactNode[];
  empty: string;
  after?: React.ReactNode;
}) {
  if (items.length === 0) {
    return (
      <Section title={title} note={note}>
        <Text style={styles.muted}>{empty}</Text>
      </Section>
    );
  }
  return (
    <Section title={title} note={note} keepTogether={false} lead={<>{head}{items[0]}</>}>
      {items.slice(1)}
      {after}
    </Section>
  );
}

/** The answer to "what did the group decide?", set large, with the explanation under it. */
export function Verdict({ insights }: { insights: PollInsights }) {
  const open = insights.common.status !== "CLOSED";
  const name = verdictName(insights);
  const { byType, common } = insights;
  const consensus =
    (byType.kind === "CHOICE" || byType.kind === "RANKING") && common.hasEnoughData ? byType.consensus : null;
  const polarized = byType.kind === "RATING" && common.hasEnoughData ? byType.polarizedLabels : [];
  return (
    <View style={{ marginTop: 20, borderLeftWidth: 3, borderLeftColor: color.signal, paddingLeft: 12 }} wrap={false}>
      <Text style={styles.kicker}>
        {[outcomeLabel(byType.outcome, open), consensus && CONSENSUS_LABEL[consensus]].filter(Boolean).join("  ·  ")}
      </Text>
      {name && <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 18, lineHeight: 1.2, marginTop: 4 }}>{name}</Text>}
      <Text style={{ fontSize: name ? 10.5 : 13, marginTop: 4, color: name ? color.muted : color.ink }}>
        {headlineSentence(insights)}
      </Text>
      {polarized.length > 0 && (
        <Text style={[styles.small, styles.muted, { marginTop: 4 }]}>
          Opinions split on {formatList(polarized)}: many rated {polarized.length === 1 ? "it" : "them"} very low and many very high.
        </Text>
      )}
    </View>
  );
}

export type Stat = { label: string; value: string; detail?: string };

export function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }} wrap={false}>
      {stats.map((stat) => (
        <View key={stat.label} style={{ flex: 1, borderWidth: 0.75, borderColor: color.line, borderRadius: 6, padding: 8 }}>
          <Text style={[styles.small, styles.muted]}>{stat.label}</Text>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 15, marginTop: 2 }}>{stat.value}</Text>
          {stat.detail && <Text style={[styles.small, styles.muted]}>{stat.detail}</Text>}
        </View>
      ))}
    </View>
  );
}

/** The headline numbers every report starts with. */
export function summaryStats({ insights }: PollExport): Stat[] {
  const { common } = insights;
  const stats: Stat[] = [{ label: "Responses", value: String(common.totalResponses) }];
  if (common.responseRate) {
    stats.push({
      label: "Response rate",
      value: `${common.responseRate.percent}%`,
      detail: `of ${common.expectedParticipants} expected`,
    });
  }
  stats.push({ label: "Comments", value: String(common.comments.length) });
  stats.push({
    label: "Last vote",
    value: common.lastResponseAt ? formatDate(common.lastResponseAt) : "None yet",
  });
  return stats;
}

export function Legend({ items }: { items: { label: string; fill: string }[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
      {items.map((item) => (
        <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: item.fill }} />
          <Text style={[styles.small, styles.muted]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * One labelled bar per option: name and value on one line, the bar under it,
 * then any detail. Single bars: the leader is the accent and the rest recede.
 * Two-segment bars keep the same two colours on every row, so the legend
 * always holds; the leader is marked by its bold label instead.
 */
function BarRow({ bar, legend }: { bar: ResultBars["bars"][number]; legend: boolean }) {
  const fills = legend ? [color.signal, color.accentSoft] : [bar.leading ? color.signal : color.rest];
  return (
    <View style={{ paddingVertical: 4 }} wrap={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
        <Text style={[{ flex: 1, paddingRight: 12 }, bar.leading ? styles.bold : {}]}>{bar.label}</Text>
        <Text style={bar.leading ? styles.bold : undefined}>{bar.value}</Text>
      </View>
      {/* Track, then the segments; a thin surface gap separates "yes" from "if need be". */}
      <View style={{ height: 8, borderRadius: 3, backgroundColor: color.track, flexDirection: "row", overflow: "hidden" }}>
        {bar.segments.map((value, i) =>
          value > 0 ? (
            <View key={i} style={{ width: `${value * 100}%`, backgroundColor: fills[i], marginLeft: i > 0 ? 1.5 : 0 }} />
          ) : null,
        )}
      </View>
      {bar.detail && <Text style={[styles.small, styles.muted, { marginTop: 2 }]}>{bar.detail}</Text>}
    </View>
  );
}

/** The results as a titled list of bars; runs over pages when there are many options. */
export function ResultsSection({ result }: { result: ResultBars }) {
  return (
    <ListSection
      title="Results"
      note={result.measure}
      items={result.bars.map((bar) => (
        <BarRow key={bar.optionId} bar={bar} legend={result.legend !== null} />
      ))}
      empty="No options."
      after={
        result.legend && (
          <Legend
            items={[
              { label: result.legend[0], fill: color.signal },
              { label: result.legend[1], fill: color.accentSoft },
            ]}
          />
        )
      }
    />
  );
}

export type HeatCell = { text: string; intensity: number; tone?: CellTone } | null;
export type HeatRow = { label: string; cells: HeatCell[] };

/** A grid where every cell carries its number, and colour only reinforces it. */
export function HeatTable({ columns, rows, labelWidth = 140 }: { columns: string[]; rows: HeatRow[]; labelWidth?: number }) {
  // Text needs an explicit width here: inside a centred flex box it would shrink to nothing.
  const cellStyle = { flex: 1, marginLeft: 2, paddingVertical: 4.5, borderRadius: 3 } as const;
  const cellText = { width: "100%", textAlign: "center", fontSize: 8, lineHeight: 1 } as const;
  return (
    <View>
      <View style={{ flexDirection: "row", marginBottom: 2 }}>
        <View style={{ width: labelWidth }} />
        {columns.map((column) => (
          <View key={column} style={{ flex: 1, marginLeft: 2 }}>
            <Text style={[cellText, styles.small, styles.muted]}>{column}</Text>
          </View>
        ))}
      </View>
      {rows.map((row) => (
        <View key={row.label} style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }} wrap={false}>
          <Text style={{ width: labelWidth, paddingRight: 6, fontSize: 8.5, lineHeight: 1.2 }}>{row.label}</Text>
          {row.cells.map((cell, i) =>
            cell === null ? (
              <View key={i} style={[cellStyle, { backgroundColor: color.canvas }]}>
                <Text style={cellText}> </Text>
              </View>
            ) : (
              <View key={i} style={[cellStyle, { backgroundColor: heatFill(cell.intensity, cell.tone) }]}>
                {/* A space keeps empty cells the same height as the rest. */}
                <Text style={cellText}>{cell.text || " "}</Text>
              </View>
            ),
          )}
        </View>
      ))}
    </View>
  );
}

type AxisFormat = (value: number) => string;

const CHART_PAD = { top: 8, right: 8, bottom: 18, left: 34 };

function Gridlines({ width, height, max, format }: { width: number; height: number; max: number; format: AxisFormat }) {
  const plotHeight = height - CHART_PAD.top - CHART_PAD.bottom;
  const ticks = [0, 0.5, 1];
  return (
    <>
      {ticks.map((tick) => {
        const y = CHART_PAD.top + plotHeight * (1 - tick);
        return (
          <Line
            key={tick}
            x1={CHART_PAD.left}
            x2={width - CHART_PAD.right}
            y1={y}
            y2={y}
            stroke={tick === 0 ? color.muted : color.line}
            strokeWidth={tick === 0 ? 0.75 : 0.5}
          />
        );
      })}
      {ticks.map((tick) => (
        <Text
          key={`label-${tick}`}
          x={CHART_PAD.left - 4}
          y={CHART_PAD.top + plotHeight * (1 - tick) + 2.5}
          textAnchor="end"
          style={{ fontSize: 7, fill: color.muted }}
        >
          {format(max * tick)}
        </Text>
      ))}
    </>
  );
}

/**
 * X-axis labels, thinned so they never collide: every nth, plus the last, which
 * is right-aligned so it stays on the page. A regular label too close to the
 * last one is dropped.
 */
function XLabels({ labels, x, height }: { labels: string[]; x: (i: number) => number; height: number }) {
  const every = Math.max(1, Math.ceil(labels.length / 8));
  const last = labels.length - 1;
  const shown = (i: number) => i === last || (i % every === 0 && (last - i >= Math.ceil(every / 2) + 1 || every === 1));
  return (
    <>
      {labels.map((label, i) =>
        shown(i) ? (
          <Text
            key={i}
            x={x(i)}
            y={height - 5}
            textAnchor={i === last && labels.length > 1 ? "end" : "middle"}
            style={{ fontSize: 7, fill: color.muted }}
          >
            {label}
          </Text>
        ) : null,
      )}
    </>
  );
}

export type LineSeries = { label: string; fill: string; values: (number | null)[] };

/** One y axis, 2px lines, a marker on the last point, legend with the final value. */
export function LineChart({
  series,
  xLabels,
  max,
  format,
  height = 150,
}: {
  series: LineSeries[];
  xLabels: string[];
  max: number;
  format: AxisFormat;
  height?: number;
}) {
  const width = CONTENT_WIDTH;
  const plotWidth = width - CHART_PAD.left - CHART_PAD.right;
  const plotHeight = height - CHART_PAD.top - CHART_PAD.bottom;
  const x = (i: number) => CHART_PAD.left + (xLabels.length === 1 ? plotWidth / 2 : (plotWidth * i) / (xLabels.length - 1));
  const y = (value: number) => CHART_PAD.top + plotHeight * (1 - Math.min(value / (max || 1), 1));

  return (
    <View>
      <Svg width={width} height={height}>
        <Gridlines width={width} height={height} max={max} format={format} />
        {series.map((line) => {
          const points = line.values.flatMap((value, i) => (value === null ? [] : [`${x(i)},${y(value)}`]));
          const lastIndex = line.values.findLastIndex((value) => value !== null);
          return (
            <G key={line.label}>
              {points.length > 1 && <Polyline points={points.join(" ")} stroke={line.fill} strokeWidth={2} fill="none" />}
              {lastIndex >= 0 && (
                <Circle cx={x(lastIndex)} cy={y(line.values[lastIndex]!)} r={3} fill={line.fill} stroke={color.panel} strokeWidth={1.5} />
              )}
            </G>
          );
        })}
        <XLabels labels={xLabels} x={x} height={height} />
      </Svg>
      {series.length > 1 && (
        <Legend
          items={series.map((line) => {
            const last = line.values.findLast((value) => value !== null);
            return { label: `${line.label}${last == null ? "" : `: ${format(last)}`}`, fill: line.fill };
          })}
        />
      )}
    </View>
  );
}

/** Vertical bars from a shared baseline, each labelled with its value. */
export function ColumnChart({
  values,
  xLabels,
  format = String,
  height = 120,
  width = CONTENT_WIDTH,
  fill = color.signal,
}: {
  values: number[];
  xLabels: string[];
  format?: AxisFormat;
  height?: number;
  width?: number;
  fill?: string;
}) {
  const max = Math.max(1, ...values);
  const plotWidth = width - CHART_PAD.left - CHART_PAD.right;
  const plotHeight = height - CHART_PAD.top - CHART_PAD.bottom;
  const slot = plotWidth / Math.max(values.length, 1);
  const barWidth = Math.min(28, slot * 0.7);
  const x = (i: number) => CHART_PAD.left + slot * i + slot / 2;
  return (
    <Svg width={width} height={height}>
      <Gridlines width={width} height={height} max={max} format={format} />
      {values.map((value, i) => {
        const barHeight = (plotHeight * value) / max;
        const top = CHART_PAD.top + plotHeight - barHeight;
        return (
          <G key={i}>
            {value > 0 && <Rect x={x(i) - barWidth / 2} y={top} width={barWidth} height={barHeight} rx={2} fill={fill} />}
            {value > 0 && slot > 14 && (
              <Text x={x(i)} y={top - 2} textAnchor="middle" style={{ fontSize: 6.5, fill: color.ink }}>
                {format(value)}
              </Text>
            )}
          </G>
        );
      })}
      <XLabels labels={xLabels} x={x} height={height} />
    </Svg>
  );
}

/** A hairline divider between rows. */
export function Rule({ strong = false }: { strong?: boolean }) {
  return <View style={{ height: strong ? 0.75 : 0.5, backgroundColor: strong ? color.muted : color.line }} />;
}

export function CommentsSection({ title, insights, limit }: { title: string; insights: PollInsights; limit?: number }) {
  const all = insights.common.comments;
  const comments = limit ? all.slice(0, limit) : all;
  return (
    <ListSection
      title={title}
      note={all.length > 0 ? plural(all.length, "comment") : undefined}
      empty="No comments."
      items={comments.map((comment) => (
        <View key={comment.id} wrap={false}>
          <View style={{ paddingVertical: 5 }}>
            <Text>{comment.text}</Text>
            <Text style={[styles.small, styles.muted, { marginTop: 1 }]}>
              {[comment.author, comment.at ? formatDateTime(comment.at) : formatDayKey(comment.day)].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <Rule />
        </View>
      ))}
      after={
        comments.length < all.length && (
          <Text style={[styles.small, styles.muted, { marginTop: 4 }]}>
            And {plural(all.length - comments.length, "more comment")} in the results report.
          </Text>
        )
      }
    />
  );
}

export { formatPercent };
