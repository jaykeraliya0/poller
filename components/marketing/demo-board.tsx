import { RowBadge } from "@/components/insights/row-badge";
import { TallyLegend, TallyRow } from "@/components/insights/tally";
import { cn } from "@/lib/utils";

const SLOTS = [
  { time: "Thu 7pm", yes: 3, maybe: 2 },
  { time: "Fri 6pm", yes: 5, maybe: 1, best: true },
  { time: "Sat 1pm", yes: 2, maybe: 1 },
  { time: "Sun 11am", yes: 1, maybe: 3 },
];

/**
 * A static example of the results board, shown on the landing and sign-in
 * pages. Built from the real tally components so it never drifts from the app.
 */
export function DemoBoard({ className }: { className?: string }) {
  return (
    <figure
      className={cn("panel flex flex-col gap-5 p-5 shadow-[0_24px_60px_-20px_rgb(21_24_35/0.25)] sm:p-6", className)}
      aria-label="Example results for a poll called Team dinner: when works?"
    >
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className="size-1.5 rounded-full bg-open" aria-hidden />
          6 of 6 voted
        </span>
        <span>Team dinner: when works?</span>
      </div>
      <p className="font-display text-[1.45rem] leading-[1.15] font-bold text-balance">
        Fri 6pm works for 5 of 6 people (+1 if need be)
      </p>
      <ol className="flex flex-col gap-2">
        {SLOTS.map((slot, index) => (
          <li key={slot.time}>
            <TallyRow
              index={index}
              max={6}
              label={
                <span className="flex items-center gap-2">
                  {slot.time}
                  {slot.best && <RowBadge>Best time</RowBadge>}
                </span>
              }
              value={`${slot.yes} yes`}
              segments={[
                { value: slot.yes, label: "Yes", tone: "signal" },
                { value: slot.maybe, label: "If need be", tone: "soft" },
              ]}
            />
          </li>
        ))}
      </ol>
      <TallyLegend
        items={[
          { label: "Yes", tone: "signal" },
          { label: "If need be", tone: "soft" },
        ]}
      />
    </figure>
  );
}
