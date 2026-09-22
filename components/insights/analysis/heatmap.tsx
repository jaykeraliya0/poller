export type HeatCell = {
  /** Shown in the cell; empty string for a quiet cell. */
  text: string;
  /** 0–1 strength of the fill. */
  intensity: number;
  /** Full sentence for hover and screen readers. */
  description: string;
  /** Sequential cells use the signal hue; diverging cells pick a pole. */
  tone?: "sequential" | "positive" | "negative";
};

type HeatmapProps = {
  caption: string;
  columns: { key: string; label: React.ReactNode; title?: string }[];
  rows: { key: string; label: React.ReactNode; cells: (HeatCell | null)[] }[];
  /** Short text for cells that don't apply (e.g. an option against itself). */
  blank?: string;
};

/** Grids wider than this get a full-width panel so cells never get cramped. */
const HALF_WIDTH_COLUMNS = 5;

/** Panel class for a grid with this many data columns. */
export const heatmapSpan = (columns: number) => (columns > HALF_WIDTH_COLUMNS ? "xl:col-span-2" : undefined);

/*
 * Tint strengths. Past ~74% signal, neither ink nor on-fill text reaches 4.5:1
 * in both themes, so the ramp stops there and text always stays ink.
 */
const SEQUENTIAL_MIN = 14;
const SEQUENTIAL_MAX = 72;
// Diverging poles stop sooner so the two sides read as "leaning", not "absolute".
const DIVERGING_MAX = 60;

const tint = (pole: string, percent: number) => `color-mix(in oklab, ${pole} ${Math.round(percent)}%, var(--panel))`;

/** Background for a 0–1 magnitude on the signal hue; empty track at zero. */
export function sequentialFill(intensity: number): string {
  const clamped = Math.min(Math.max(intensity, 0), 1);
  return clamped === 0 ? "var(--viz-track)" : tint("var(--viz-accent)", SEQUENTIAL_MIN + clamped * (SEQUENTIAL_MAX - SEQUENTIAL_MIN));
}

function fill(cell: HeatCell): string {
  const intensity = Math.min(Math.max(cell.intensity, 0), 1);
  if (intensity === 0 || !(cell.tone === "positive" || cell.tone === "negative")) return sequentialFill(intensity);
  const pole = cell.tone === "positive" ? "var(--viz-accent)" : "var(--viz-negative)";
  return tint(pole, 12 + intensity * (DIVERGING_MAX - 12));
}

/**
 * A real table with tinted cells: one hue light to dark for magnitude, or two
 * poles for "better / worse than even". Every cell carries its number, so
 * colour is never the only way to read it.
 */
export function Heatmap({ caption, columns, rows, blank = "–" }: HeatmapProps) {
  return (
    // Fixed layout: cells share the width evenly and shrink to fit rather than scroll,
    // up to a comfortable cell size so a few columns don't stretch into slabs.
    <table
      className="w-full table-fixed border-separate border-spacing-[3px] text-sm"
      style={{ maxWidth: `calc(9rem + ${columns.length} * 4.5rem)` }}
    >
      <caption className="sr-only">{caption}</caption>
      <colgroup>
        <col className="w-24 sm:w-36" />
      </colgroup>
      <thead>
        <tr>
          <td />
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              title={column.title}
              className="truncate pb-1 text-center text-xs font-medium text-muted-foreground tabular-nums"
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row" className="pr-1.5 text-left text-xs font-medium">
              <span className="line-clamp-2 wrap-break-word">{row.label}</span>
            </th>
            {row.cells.map((cell, i) => {
              if (!cell) {
                return (
                  <td key={columns[i].key} className="h-9 rounded-[5px] text-center text-xs text-muted-foreground">
                    <span aria-hidden>{blank}</span>
                    <span className="sr-only">Not applicable</span>
                  </td>
                );
              }
              return (
                <td
                  key={columns[i].key}
                  title={cell.description}
                  className="h-9 rounded-[5px] text-center text-[0.6875rem] font-medium text-foreground tabular-nums sm:text-xs"
                  style={{ background: fill(cell) }}
                >
                  <span aria-hidden>{cell.text}</span>
                  <span className="sr-only">{cell.description}</span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
      </table>
  );
}

/** Light-to-dark key for sequential heatmaps. */
export function HeatmapScale({ low, high }: { low: string; high: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-hidden>
      <span>{low}</span>
      <span
        className="h-2 w-20 rounded-full"
        style={{ background: `linear-gradient(90deg, ${sequentialFill(0.001)}, ${sequentialFill(1)})` }}
      />
      <span>{high}</span>
    </div>
  );
}
