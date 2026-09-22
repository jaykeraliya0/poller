import { cn } from "@/lib/utils";

export type TallyTone = "signal" | "soft" | "rest" | "negative";

type TallySegment = { value: number; tone: TallyTone; label: string };

const TONE_CLASS: Record<TallyTone, string> = {
  signal: "bg-viz-accent",
  soft: "bg-viz-accent-soft",
  rest: "bg-viz-rest",
  negative: "bg-viz-negative",
};

type TallyRowProps = {
  label: React.ReactNode;
  /** Right-aligned figure, e.g. "5 votes · 71%". */
  value: React.ReactNode;
  segments: TallySegment[];
  max: number;
  /** Row position, used to stagger the fill animation. */
  index?: number;
  className?: string;
};

/**
 * One option on the tally board: the bar is the row. The label and figure sit
 * on top of the fill and switch to the on-fill colour exactly where the strong
 * fill passes behind them (a clipped gradient, so the text exists only once).
 */
export function TallyRow({ label, value, segments, max, index = 0, className }: TallyRowProps) {
  const visible = segments.filter((segment) => segment.value > 0);
  const width = (value: number) => (max > 0 ? Math.min((value / max) * 100, 100) : 0);
  // Only a leading run of "signal" segments is dark enough for light text.
  let strong = 0;
  for (const segment of visible) {
    if (segment.tone !== "signal") break;
    strong += width(segment.value);
  }

  return (
    <div
      className={cn("relative isolate overflow-hidden rounded-[9px] bg-viz-track", className)}
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="tally-fill absolute inset-y-0 left-0 -z-10 flex w-full" aria-hidden>
        {visible.map((segment, i) => (
          <div
            key={segment.label}
            title={`${segment.label}: ${segment.value}`}
            className={cn("h-full min-w-1", TONE_CLASS[segment.tone], i > 0 && "border-l-2 border-panel")}
            style={{ width: `${width(segment.value)}%` }}
          />
        ))}
      </div>
      <div
        className="flex min-h-11 items-center justify-between gap-3 bg-clip-text px-3.5 py-2.5 text-transparent"
        style={{
          backgroundImage: `linear-gradient(90deg, var(--primary-foreground) ${strong}%, var(--foreground) ${strong}%)`,
        }}
      >
        <span className="min-w-0 font-medium wrap-break-word">{label}</span>
        <span className="shrink-0 text-right text-sm font-medium tabular-nums">{value}</span>
      </div>
    </div>
  );
}

/** Small colour key for stacked tallies. */
export function TallyLegend({ items }: { items: { label: string; tone: TallyTone | "track" }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            className={cn("size-2.5 rounded-[3px]", item.tone === "track" ? "border bg-viz-track" : TONE_CLASS[item.tone])}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
