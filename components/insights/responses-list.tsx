import { formatRelative } from "@/lib/datetime";
import type { ResponseRow } from "@/lib/poll/results";

/** Who voted for what; only rendered for named polls. A list, not a table, so it never scrolls sideways on phones. */
export function ResponsesList({ rows, now }: { rows: ResponseRow[]; now: Date }) {
  return (
    <ul className="-mx-1 flex flex-col divide-y">
      {rows.map((row) => (
        <li key={row.id} className="grid gap-x-4 gap-y-0.5 px-1 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-baseline">
          <span className="font-medium break-words">{row.voterName ?? "Unnamed"}</span>
          <span className="text-sm text-muted-foreground break-words">{row.summary}</span>
          <span className="text-xs text-muted-foreground sm:text-right">{formatRelative(row.submittedAt, now)}</span>
        </li>
      ))}
    </ul>
  );
}
