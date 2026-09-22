import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { AutoRefresh } from "@/components/insights/auto-refresh";
import { PollResults } from "@/components/insights/poll-results";
import { PollHeader } from "@/components/poll/poll-header";
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
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" aria-hidden />
          My polls
        </Link>
        {open && <AutoRefresh />}
      </div>

      <PollHeader poll={poll} isOwner={false} now={now} />

      <div className="flex flex-wrap gap-2">
        <ShareSheet url={shareUrl} title={poll.title} defaultOpen={created === "1"} />
        {open ? <ClosePollDialog pollId={poll.id} /> : canReopen(poll, now) && <ReopenPollButton pollId={poll.id} />}
        <ButtonLink href={`/p/${poll.slug}/results`} variant="ghost" size="lg" className="h-11">
          <ExternalLinkIcon data-icon="inline-start" aria-hidden />
          Voter view
        </ButtonLink>
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
