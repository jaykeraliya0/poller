import type { Metadata } from "next";
import { ExternalLinkIcon, PencilIcon } from "lucide-react";
import { AppPage } from "@/components/layout/app-page";
import { BackLink } from "@/components/shared/back-link";
import { AutoRefresh } from "@/components/insights/auto-refresh";
import { BoardSection } from "@/components/insights/board-section";
import { PollResults } from "@/components/insights/poll-results";
import { PollHeader } from "@/components/poll/poll-header";
import { PollMoreMenu } from "@/components/poll/poll-more-menu";
import { ClosePollDialog, ReopenPollButton } from "@/components/poll/poll-status-controls";
import { SharePanel } from "@/components/poll/share-panel";
import { ShareSheet } from "@/components/poll/share-sheet";
import { ButtonLink } from "@/components/shared/button-link";
import { requirePageOwner } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { loadPollResults } from "@/lib/poll/results";
import { canReopen, isPollOpen } from "@/lib/poll/status";
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
  const { insights, rows } = await loadPollResults(poll, now);
  const shareUrl = pollShareUrl(poll.slug);

  return (
    <AppPage>
      <div className="flex items-center justify-between gap-3">
        <BackLink href="/dashboard">My polls</BackLink>
        {open && <AutoRefresh />}
      </div>

      <PollHeader
        poll={poll}
        isOwner={false}
        now={now}
        meta={<span className="text-sm text-muted-foreground">{getPollType(poll.type).label}</span>}
        actions={
          <>
            <ShareSheet url={shareUrl} title={poll.title} defaultOpen={created === "1"} />
            {open ? <ClosePollDialog pollId={poll.id} /> : canReopen(poll, now) && <ReopenPollButton pollId={poll.id} />}
            <ButtonLink href={`/polls/${poll.id}/edit`} variant="outline" size="lg">
              <PencilIcon data-icon="inline-start" aria-hidden />
              Edit
            </ButtonLink>
            <ButtonLink href={`/p/${poll.slug}/results`} variant="outline" size="lg">
              <ExternalLinkIcon data-icon="inline-start" aria-hidden />
              Voter view
            </ButtonLink>
            <PollMoreMenu pollId={poll.id} title={poll.title} responseCount={insights.common.totalResponses} />
          </>
        }
      />

      <PollResults
        poll={poll}
        insights={insights}
        rows={rows}
        // The owner sees names on named polls, never on anonymous ones.
        showNames={!poll.isAnonymous}
        now={now}
        emptyAction={
          <div className="w-full text-left">
            <SharePanel url={shareUrl} title={poll.title} />
          </div>
        }
        rail={
          open && (
            <BoardSection id="share-heading" title="Share link" description="Anyone with the link can vote.">
              <SharePanel url={shareUrl} title={poll.title} />
            </BoardSection>
          )
        }
      />
    </AppPage>
  );
}
