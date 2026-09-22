"use client";

import { Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export type ShareSlice = { key: string; label: string; count: number; color: string };

/**
 * Part-to-whole for single-choice polls. The ring is the glance; the list
 * beside it doubles as the legend and carries every slice's count and share,
 * with a bar on the same scale so it fills the panel with something to read.
 */
export function ShareDonut({ slices, total }: { slices: ShareSlice[]; total: number }) {
  const config = Object.fromEntries(slices.map((slice) => [slice.key, { label: slice.label, color: slice.color }])) satisfies ChartConfig;
  const percent = (count: number) => `${Math.round((count / total) * 100)}%`;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
      <ChartContainer config={config} className="aspect-square h-40 shrink-0" aria-hidden>
        {/* Hidden from assistive tech (the list carries the data), so no keyboard layer either. */}
        <PieChart accessibilityLayer={false}>
          <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
          <Pie
            data={slices}
            dataKey="count"
            nameKey="key"
            innerRadius="62%"
            outerRadius="100%"
            stroke="var(--panel)"
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
            rootTabIndex={-1}
            isAnimationActive={false}
          >
            {slices.map((slice) => (
              <Cell key={slice.key} fill={slice.color} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox)) return null;
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} dy="-0.2em" className="fill-foreground text-2xl font-bold">
                      {total}
                    </tspan>
                    <tspan x={viewBox.cx} dy="1.5em" className="fill-muted-foreground text-xs">
                      {total === 1 ? "vote" : "votes"}
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="flex w-full min-w-0 flex-1 flex-col divide-y" aria-label="Vote share by option">
        {slices.map((slice) => (
          <li key={slice.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-2.5 first:pt-0 last:pb-0">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: slice.color }} aria-hidden />
              <span className="truncate" title={slice.label}>
                {slice.label}
              </span>
            </span>
            <span className="text-sm tabular-nums">
              <span className="font-medium">{percent(slice.count)}</span>
              <span className="text-muted-foreground"> · {slice.count}</span>
            </span>
            <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-viz-track" aria-hidden>
              <span className="block h-full rounded-full" style={{ width: percent(slice.count), background: slice.color }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const picksConfig = { voters: { label: "Voters", color: "var(--color-viz-accent)" } } satisfies ChartConfig;

/** How many options each voter picked on a multi-select poll. Single series, so no legend. */
export function PicksHistogram({ picksPerBallot }: { picksPerBallot: number[] }) {
  const data = picksPerBallot.map((voters, i) => ({ label: `${i + 1}`, voters }));
  return (
    <ChartContainer config={picksConfig} className="aspect-auto h-40 w-full">
      <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 12 }} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8}>
          <Label value="Options picked" position="insideBottom" offset={-10} fontSize={11} fill="var(--muted-foreground)" />
        </XAxis>
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={<ChartTooltipContent hideIndicator labelFormatter={(label) => `Picked ${label}`} />}
        />
        <Bar dataKey="voters" fill="var(--color-voters)" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ChartContainer>
  );
}
