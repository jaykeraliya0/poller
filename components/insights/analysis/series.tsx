/** Categorical slots, in the validated order from globals.css. */
const SERIES_SLOTS = 5;

export function seriesColor(index: number): string {
  return index < SERIES_SLOTS ? `var(--viz-series-${index + 1})` : "var(--viz-rest)";
}

type LegendItem = { key: string; label: string; color: string; value?: string };

/**
 * Legend with each series' current value next to its swatch, so a reader never
 * has to match colours to read a number (and the lighter slots stay legible).
 */
export function SeriesLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm" aria-label="Legend">
      {items.map((item) => (
        <li key={item.key} className="flex min-w-0 items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: item.color }} aria-hidden />
          <span className="min-w-0 truncate text-muted-foreground" title={item.label}>
            {item.label}
          </span>
          {item.value && <span className="shrink-0 font-medium tabular-nums">{item.value}</span>}
        </li>
      ))}
    </ul>
  );
}
