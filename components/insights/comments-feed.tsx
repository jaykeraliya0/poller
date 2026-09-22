import { formatRelative } from "@/lib/datetime";
import type { CommentInsight } from "@/lib/insights/common";

const dayOnly = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function CommentsFeed({ comments, now }: { comments: CommentInsight[]; now: Date }) {
  return (
    <ul className="flex flex-col gap-3">
      {comments.map((comment) => (
        <li key={comment.id} className="flex flex-col gap-1 border-l-2 border-signal-soft pl-3">
          <p className="text-sm whitespace-pre-line break-words">{comment.text}</p>
          <p className="text-xs text-muted-foreground">
            {comment.author ?? "Anonymous"} ·{" "}
            {/* Anonymous comments only get a day, to make them harder to trace back. */}
            {comment.at ? formatRelative(comment.at, now) : dayOnly(comment.day)}
          </p>
        </li>
      ))}
    </ul>
  );
}
