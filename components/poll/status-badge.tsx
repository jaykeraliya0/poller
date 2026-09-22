import { formatDistanceStrict } from "date-fns";
import { getPollStatus, type PollStatus, type PollTiming } from "@/lib/poll/status";
import { cn } from "@/lib/utils";

/** "Open", "Closes in 3 hours" or "Closed", from server time so it renders the same everywhere. */
export function statusLabel(poll: PollTiming, now: Date): string {
  const status = getPollStatus(poll, now);
  if (status === "CLOSED") return "Closed";
  if (status === "CLOSING_SOON" && poll.closesAt) return `Closes in ${formatDistanceStrict(poll.closesAt, now)}`;
  return "Open";
}

/** The status pill itself, for callers that already know the status (e.g. the client-side poll list). */
export function StatusPill({ status, label, className }: { status: PollStatus; label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border bg-panel px-2.5 text-xs font-medium whitespace-nowrap",
        status === "CLOSED" && "bg-muted text-muted-foreground",
        status === "CLOSING_SOON" && "border-closing/30 text-closing",
        className,
      )}
    >
      {status !== "CLOSED" && (
        <span className={cn("size-1.5 rounded-full", status === "CLOSING_SOON" ? "bg-closing" : "bg-open")} aria-hidden />
      )}
      {label}
    </span>
  );
}

export function StatusBadge({ poll, now = new Date(), className }: { poll: PollTiming; now?: Date; className?: string }) {
  return <StatusPill status={getPollStatus(poll, now)} label={statusLabel(poll, now)} className={className} />;
}
