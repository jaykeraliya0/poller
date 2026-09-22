import { cn } from "@/lib/utils";

/**
 * Pill that sits inside a tally row. Panel-coloured so it reads on the strong
 * fill and on the empty track alike.
 */
export function RowBadge({ children, tone = "signal", className }: { children: React.ReactNode; tone?: "signal" | "neutral"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-panel px-2 text-[0.6875rem] font-semibold shadow-[0_0_0_1px_rgb(21_24_35/0.06)] [&_svg]:size-3",
        tone === "signal" ? "text-signal-ink" : "text-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
