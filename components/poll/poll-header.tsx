import { SlidersHorizontalIcon } from "lucide-react";
import type { Poll } from "@/generated/prisma/client";
import { ButtonLink } from "@/components/shared/button-link";
import { isPollOpen } from "@/lib/poll/status";
import { cn } from "@/lib/utils";
import { DeadlineCountdown } from "./deadline-countdown";
import { StatusBadge } from "./status-badge";

type PollHeaderProps = {
  poll: Pick<Poll, "id" | "title" | "description" | "closesAt" | "closedAt">;
  isOwner: boolean;
  now: Date;
  /** Extra items for the meta row, e.g. the type or the live indicator. */
  meta?: React.ReactNode;
  /** Buttons to the right of the title on wide screens. */
  actions?: React.ReactNode;
  className?: string;
};

export function PollHeader({ poll, isOwner, now, meta, actions, className }: PollHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusBadge poll={poll} now={now} />
        {poll.closesAt && isPollOpen(poll, now) && <DeadlineCountdown closesAt={poll.closesAt} renderedAt={now} />}
        {meta}
        {isOwner && (
          <ButtonLink href={`/polls/${poll.id}/manage`} variant="ghost" size="sm" className="ml-auto">
            <SlidersHorizontalIcon data-icon="inline-start" aria-hidden />
            Manage
          </ButtonLink>
        )}
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="font-display text-[1.9rem] leading-[1.08] font-bold break-words sm:text-[2.4rem]">{poll.title}</h1>
          {poll.description && (
            <p className="max-w-[65ch] text-[1.0625rem] whitespace-pre-line text-muted-foreground">{poll.description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
