import { SettingsIcon } from "lucide-react";
import type { Poll } from "@/generated/prisma/client";
import { ButtonLink } from "@/components/shared/button-link";
import { isPollOpen } from "@/lib/poll/status";
import { DeadlineCountdown } from "./deadline-countdown";
import { StatusBadge } from "./status-badge";

type PollHeaderProps = {
  poll: Pick<Poll, "id" | "title" | "description" | "closesAt" | "closedAt">;
  isOwner: boolean;
  now: Date;
};

export function PollHeader({ poll, isOwner, now }: PollHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusBadge poll={poll} now={now} />
        {poll.closesAt && isPollOpen(poll, now) && <DeadlineCountdown closesAt={poll.closesAt} renderedAt={now} />}
        {isOwner && (
          <ButtonLink href={`/polls/${poll.id}/manage`} variant="ghost" size="sm" className="ml-auto">
            <SettingsIcon data-icon="inline-start" aria-hidden />
            Manage
          </ButtonLink>
        )}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight break-words">{poll.title}</h1>
      {poll.description && <p className="whitespace-pre-line text-muted-foreground">{poll.description}</p>}
    </header>
  );
}
