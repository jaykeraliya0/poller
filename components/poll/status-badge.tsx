import { formatDistanceStrict } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { getPollStatus, type PollTiming } from "@/lib/poll/status";
import { cn } from "@/lib/utils";

/** Server-rendered so the relative time is computed once, from server time. */
export function StatusBadge({ poll, now = new Date() }: { poll: PollTiming; now?: Date }) {
  const status = getPollStatus(poll, now);

  if (status === "CLOSED") return <Badge variant="secondary">Closed</Badge>;

  const closingSoon = status === "CLOSING_SOON" && poll.closesAt;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        closingSoon && "border-amber-500/40 text-amber-700 dark:text-amber-400",
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", closingSoon ? "bg-amber-500" : "bg-emerald-500")}
        aria-hidden
      />
      {closingSoon ? `Closes in ${formatDistanceStrict(poll.closesAt!, now)}` : "Open"}
    </Badge>
  );
}
