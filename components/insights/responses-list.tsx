import { formatRelative } from "@/lib/datetime";
import type { ResponseRow } from "@/lib/poll/results";

/** Who voted for what; only rendered for named polls. A list, not a table, so it never scrolls sideways on phones. */
export function ResponsesList({ rows, now }: { rows: ResponseRow[]; now: Date }) {
  return (
    <ul className="flex flex-col divide-y">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium break-words">{row.voterName ?? "Unnamed"}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(row.submittedAt, now)}</span>
          </div>
          <span className="text-sm text-muted-foreground break-words">{row.summary}</span>
        </li>
      ))}
    </ul>
  );
}
