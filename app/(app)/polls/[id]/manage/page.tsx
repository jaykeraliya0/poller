import type { Metadata } from "next";
import { ArchiveIcon, ExternalLinkIcon, PencilIcon } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { BackLink } from "@/components/shared/back-link";
import { AutoRefresh } from "@/components/insights/auto-refresh";
import { BoardSection } from "@/components/insights/board-section";
import { PollResults } from "@/components/insights/poll-results";
import { AccessPanel } from "@/components/poll/access-panel";
import { PollHeader } from "@/components/poll/poll-header";
import { PollMoreMenu } from "@/components/poll/poll-more-menu";
import { ReminderControl } from "@/components/poll/reminder-control";
import { ClosePollDialog, ReopenPollButton, UnarchivePollButton } from "@/components/poll/poll-status-controls";
import { SharePanel } from "@/components/poll/share-panel";
import { ShareSheet } from "@/components/poll/share-sheet";
import { ButtonLink } from "@/components/shared/button-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requirePageOwner } from "@/lib/auth/guards";
import { formatRelative } from "@/lib/datetime";
import { db } from "@/lib/db";
import { getReminderStatus } from "@/lib/email/poll-emails";
import { listPollAccess } from "@/lib/poll/invites";
import { loadPollResults } from "@/lib/poll/results";
import { deadlinePassed, isPollOpen } from "@/lib/poll/status";
import { pollShareUrl } from "@/lib/urls";
import { getPollType } from "@/poll-types/registry";

export const metadata: Metadata = { title: "Manage poll", robots: { index: false } };

export default async function ManagePollPage({ params, searchParams }: PageProps<"/polls/[id]/manage">) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const { poll: base } = await requirePageOwner(id, `/polls/${id}/manage`);
  const poll = await db.poll.findUniqueOrThrow({
    where: { id: base.id },
    include: { options: { orderBy: { position: "asc" } } },
  });

  const now = new Date();
  const open = isPollOpen(poll, now);
  const isPrivate = poll.visibility === "PRIVATE";
  const [{ insights, rows }, access, reminders] = await Promise.all([
    loadPollResults(poll, now),
    isPrivate ? listPollAccess(poll) : null,
    isPrivate && open ? getReminderStatus(poll, now) : null,
  ]);
  const shareUrl = pollShareUrl(poll.slug);
  const linkDescription = isPrivate ? "Only people you invite can open it." : "Anyone with the link can vote.";

  // Private polls keep this even when closed: access still decides who sees the results.
  const accessSection = access && (
    <BoardSection
      id="access-heading"
      title="Who's invited"
      count={access.invites.length + access.groups.filter((group) => group.linked).length || undefined}
      description="Only these people (and you) can open this poll."
    >
      <div className="flex flex-col gap-6">
        {reminders && (
          <ReminderControl
            pollId={poll.id}
            pending={reminders.pending}
            nextReminderIn={reminders.nextReminderAt && formatRelative(reminders.nextReminderAt, now)}
          />
        )}
        <AccessPanel pollId={poll.id} access={access} />
      </div>
    </BoardSection>
  );

  return (
    <AppPage>
      <div className="flex items-center justify-between gap-3">
        <BackLink href={poll.archivedAt ? "/dashboard?status=archived" : "/dashboard"}>
          {poll.archivedAt ? "Archived polls" : "My polls"}
        </BackLink>
        {open && <AutoRefresh />}
      </div>

      <PollHeader
        poll={poll}
        isOwner={false}
        now={now}
        meta={<span className="text-sm text-muted-foreground">{getPollType(poll.type).label}</span>}
        actions={
          <>
            <ShareSheet
              url={shareUrl}
              title={poll.title}
              description={linkDescription}
              defaultOpen={created === "1"}
            >
              {access && <AccessPanel pollId={poll.id} access={access} />}
            </ShareSheet>
            {open ? (
              <>
                <ClosePollDialog pollId={poll.id} />
                <ButtonLink href={`/polls/${poll.id}/edit`} variant="outline" size="lg">
                  <PencilIcon data-icon="inline-start" aria-hidden />
                  Edit
                </ButtonLink>
              </>
            ) : poll.archivedAt ? (
              // Archived polls come back to the main list first; reopening is a separate step.
              <UnarchivePollButton pollId={poll.id} />
            ) : (
              // Closed polls are read-only; reopening is the way back to editing.
              <ReopenPollButton pollId={poll.id} needsDeadline={deadlinePassed(poll, now)} />
            )}
            <ButtonLink href={`/p/${poll.slug}/results`} variant="outline" size="lg">
              <ExternalLinkIcon data-icon="inline-start" aria-hidden />
              Voter view
            </ButtonLink>
            <PollMoreMenu
              pollId={poll.id}
              title={poll.title}
              responseCount={insights.common.totalResponses}
              archived={poll.archivedAt !== null}
            />
          </>
        }
      />

      {poll.archivedAt && (
        <Alert>
          <ArchiveIcon aria-hidden />
          <AlertTitle>Archived {formatRelative(poll.archivedAt, now)}</AlertTitle>
          <AlertDescription>
            It&apos;s closed and off your main list, but everything is kept: results, votes and the link. Unarchive it to
            reopen or edit it.
          </AlertDescription>
        </Alert>
      )}

      <PollResults
        poll={poll}
        insights={insights}
        rows={rows}
        // The owner sees names on named polls, never on anonymous ones.
        showNames={!poll.isAnonymous}
        now={now}
        emptyAction={
          (open || accessSection) && (
            <div className="flex w-full flex-col gap-4 text-left">
              {open && <SharePanel url={shareUrl} title={poll.title} />}
              {accessSection}
            </div>
          )
        }
        rail={
          <>
            {open && (
              <BoardSection id="share-heading" title="Share link" description={linkDescription}>
                <SharePanel url={shareUrl} title={poll.title} />
              </BoardSection>
            )}
            {accessSection}
          </>
        }
      />
    </AppPage>
  );
}
