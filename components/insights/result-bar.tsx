import { cn } from "@/lib/utils";

export type BarSegment = { value: number; className: string; label: string };

/**
 * One horizontal bar on a 0–`max` scale: thin, square at the baseline, 4px
 * rounded end, 2px surface gap between stacked segments.
 */
export function ResultBar({ segments, max, className }: { segments: BarSegment[]; max: number; className?: string }) {
  const visible = segments.filter((segment) => segment.value > 0);
  return (
    <div className={cn("flex h-3 w-full gap-0.5 overflow-hidden rounded-[4px] bg-viz-track", className)} aria-hidden>
      {visible.map((segment, index) => (
        <div
          key={segment.label}
          title={`${segment.label}: ${segment.value}`}
          className={cn("h-full min-w-0.5", index === visible.length - 1 && "rounded-r-[4px]", segment.className)}
          style={{ width: max > 0 ? `${(segment.value / max) * 100}%` : 0 }}
        />
      ))}
    </div>
  );
}
