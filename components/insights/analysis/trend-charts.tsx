"use client";

import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { StandingsTrend, TurnoutPoint } from "@/lib/insights/trends";
import { SeriesLegend, seriesColor } from "./series";

const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Round-number ticks for each metric's fixed scale. */
function metricTicks({ unit, max }: StandingsTrend["metric"]): number[] {
  if (unit === "percent") return [0, 25, 50, 75, 100];
  const start = unit === "score" ? 1 : 0;
  const step = max - start > 6 ? Math.ceil((max - start) / 4) : 1;
  const ticks = [];
  for (let value = start; value < max; value += step) ticks.push(value);
  return [...ticks, max];
}

/** 0 up to at least `top` in steps of 1, 2 or 5 × 10ⁿ, about four gaps. */
function countTicks(top: number): number[] {
  const rough = Math.max(top / 4, 1);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= rough)!;
  return Array.from({ length: Math.ceil(top / step) + 1 }, (_, i) => i * step);
}

function formatMetric(value: number | null | undefined, unit: StandingsTrend["metric"]["unit"]): string {
  if (value === null || value === undefined) return "–";
  return unit === "percent" ? `${value}%` : String(value);
}

/**
 * Each leading option's standing at the end of every day. Colour follows the
 * option (by today's rank), the legend carries today's value, and a hidden
 * table repeats every point for screen readers.
 */
export function StandingsChart({ trend }: { trend: StandingsTrend }) {
  const { metric, series, points } = trend;
  const config = Object.fromEntries(
    series.map((item, i) => [`s${i}`, { label: item.label, color: seriesColor(i) }]),
  ) satisfies ChartConfig;
  const data = points.map((point) => ({
    label: dayLabel(point.day),
    ...Object.fromEntries(series.map((item, i) => [`s${i}`, point.values[item.optionId]])),
  }));
  const latest = points.at(-1)?.values ?? {};

  return (
    <div className="flex flex-col gap-3">
      <SeriesLegend
        items={series.map((item, i) => ({
          key: item.optionId,
          label: item.label,
          color: seriesColor(i),
          value: formatMetric(latest[item.optionId], metric.unit),
        }))}
      />
      <ChartContainer config={config} className="aspect-auto h-56 w-full" aria-hidden>
        {/* Hidden from assistive tech (the table below carries the data), so no keyboard layer either. */}
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
          <YAxis
            domain={[metric.unit === "score" ? 1 : 0, metric.max]}
            ticks={metricTicks(metric)}
            tickFormatter={(value: number) => formatMetric(value, metric.unit)}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--border)" }}
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2.5 rounded-[3px]" style={{ background: `var(--color-${name})` }} />
                      {config[name as keyof typeof config]?.label}
                    </span>
                    <span className="font-medium tabular-nums">{formatMetric(value as number, metric.unit)}</span>
                  </div>
                )}
              />
            }
          />
          {series.map((item, i) => (
            <Line
              key={item.optionId}
              dataKey={`s${i}`}
              type="monotone"
              stroke={`var(--color-s${i})`}
              strokeWidth={2}
              dot={points.length <= 12 ? { r: 3, strokeWidth: 2, fill: "var(--panel)" } : false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--panel)" }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
      {/* Tables ignore sr-only's 1px box, so the wrapper does the clipping. */}
      <div className="sr-only">
        <table>
          <caption>{metric.label} by day</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              {series.map((item) => (
                <th key={item.optionId} scope="col">
                  {item.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.day}>
                <th scope="row">{dayLabel(point.day)}</th>
                {series.map((item) => (
                  <td key={item.optionId}>{formatMetric(point.values[item.optionId], metric.unit)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const turnoutConfig = { total: { label: "Responses", color: "var(--color-viz-accent)" } } satisfies ChartConfig;

/** Running total of responses, against the expected head count when there is one. */
export function TurnoutChart({ turnout, expected }: { turnout: TurnoutPoint[]; expected: number | null }) {
  const data = turnout.map((point) => ({ ...point, label: dayLabel(point.day) }));
  const ticks = countTicks(Math.max(turnout.at(-1)?.total ?? 0, expected ?? 0));

  return (
    <ChartContainer config={turnoutConfig} className="aspect-auto h-44 w-full">
      <AreaChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
        <YAxis domain={[0, ticks.at(-1)!]} ticks={ticks} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<ChartTooltipContent hideIndicator />} />
        {expected ? (
          <ReferenceLine
            y={expected}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            label={{ value: `Expected ${expected}`, position: "insideTopLeft", fill: "var(--muted-foreground)", fontSize: 11, dy: -14 }}
          />
        ) : null}
        <Area
          dataKey="total"
          type="monotone"
          stroke="var(--color-total)"
          strokeWidth={2}
          fill="var(--color-total)"
          fillOpacity={0.12}
          dot={turnout.length <= 12 ? { r: 3, strokeWidth: 2, fill: "var(--panel)" } : false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
