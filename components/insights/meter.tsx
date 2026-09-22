import { cn } from "@/lib/utils";

type MeterProps = {
  /** 0–1; values above 1 are clamped visually, the label carries the real number. */
  value: number;
  label: string;
  className?: string;
};

/** A single ratio against a limit: same-hue fill on a neutral track. */
export function Meter({ value, label, className }: MeterProps) {
  const clamped = Math.min(Math.max(value, 0), 1);
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className={cn("h-2 w-full overflow-hidden rounded-[4px] bg-viz-track", className)}
    >
      <div className="h-full rounded-r-[4px] bg-viz-accent" style={{ width: `${clamped * 100}%` }} />
    </div>
  );
}
