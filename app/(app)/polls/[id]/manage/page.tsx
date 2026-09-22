import type { Metadata } from "next";
import { ExternalLinkIcon, PencilIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { BackLink } from "@/components/shared/back-link";
import { AutoRefresh } from "@/components/insights/auto-refresh";
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
    <PageContainer className="flex flex-col gap-6 py-6">
      <div className="flex items-center justify-between gap-3">
        <BackLink href="/dashboard">My polls</BackLink>
        {open && <AutoRefresh />}
      </div>

      <PollHeader poll={poll} isOwner={false} now={now} />

      <div className="flex flex-wrap gap-2">
        <ShareSheet url={shareUrl} title={poll.title} defaultOpen={created === "1"} />
        {open ? <ClosePollDialog pollId={poll.id} /> : canReopen(poll, now) && <ReopenPollButton pollId={poll.id} />}
        <ButtonLink href={`/polls/${poll.id}/edit`} variant="outline" size="lg" className="h-11">
          <PencilIcon data-icon="inline-start" aria-hidden />
          Edit
        </ButtonLink>
        <ButtonLink href={`/p/${poll.slug}/results`} variant="ghost" size="lg" className="h-11">
          <ExternalLinkIcon data-icon="inline-start" aria-hidden />
          Voter view
        </ButtonLink>
        <PollMoreMenu pollId={poll.id} title={poll.title} responseCount={insights.common.totalResponses} />
      </div>

      <PollResults
        poll={poll}
        insights={insights}
        rows={rows}
        // The owner sees names on named polls, never on anonymous ones.
        showNames={!poll.isAnonymous}
        now={now}
        emptyAction={
          <div className="w-full max-w-md text-left">
            <SharePanel url={shareUrl} title={poll.title} />
          </div>
        }
      />
    </PageContainer>
  );
}
