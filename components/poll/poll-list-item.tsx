import Link from "next/link";
import { ChevronRightIcon, UsersIcon } from "lucide-react";
import type { PollType } from "@/generated/prisma/enums";
import { formatRelative } from "@/lib/datetime";
import { plural } from "@/lib/insights/outcome";
import type { PollTiming } from "@/lib/poll/status";
import { getPollType } from "@/poll-types/registry";
import { StatusBadge } from "./status-badge";

type PollListItemProps = {
  poll: PollTiming & {
    id: string;
    title: string;
    type: PollType;
    createdAt: Date;
    expectedParticipants: number | null;
    _count: { responses: number };
  };
  now: Date;
};

export function PollListItem({ poll, now }: PollListItemProps) {
  const responses = poll._count.responses;
  return (
    <Link
      href={`/polls/${poll.id}/manage`}
      className="group flex items-center gap-3 rounded-3xl border bg-card p-4 transition-colors outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge poll={poll} now={now} />
          <span className="text-xs text-muted-foreground">{getPollType(poll.type).label}</span>
        </div>
        <p className="line-clamp-2 font-medium break-words">{poll.title}</p>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <UsersIcon className="size-4" aria-hidden />
          {plural(responses, "response")}
          {poll.expectedParticipants ? ` of ${poll.expectedParticipants}` : ""}
          <span aria-hidden>·</span>
          created {formatRelative(poll.createdAt, now)}
        </p>
      </div>
      <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
    </Link>
  );
}
