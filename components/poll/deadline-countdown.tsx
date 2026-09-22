"use client";

import { useEffect, useState } from "react";
import { formatDistanceStrict } from "date-fns";
import { ClockIcon } from "lucide-react";

type DeadlineCountdownProps = {
  closesAt: Date;
  /** Server time at render, so the first client render matches the HTML. */
  renderedAt: Date;
};

/** "Closes in 3 hours", ticking down; flips to "Voting has closed" at the deadline. */
export function DeadlineCountdown({ closesAt, renderedAt }: DeadlineCountdownProps) {
  const [now, setNow] = useState(renderedAt);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 30_000);
    const first = setTimeout(tick, 0);
    return () => {
      clearInterval(timer);
      clearTimeout(first);
    };
  }, []);

  const closed = closesAt <= now;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
      <ClockIcon className="size-3.5" aria-hidden />
      <time dateTime={closesAt.toISOString()} title={closesAt.toLocaleString()}>
        {closed ? "Voting has closed" : `Closes in ${formatDistanceStrict(closesAt, now)}`}
      </time>
    </span>
  );
}
