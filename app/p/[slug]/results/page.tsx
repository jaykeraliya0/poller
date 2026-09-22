import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, EyeOffIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { AutoRefresh } from "@/components/insights/auto-refresh";
import { PollResults } from "@/components/insights/poll-results";
import { PollHeader } from "@/components/poll/poll-header";
import { ButtonLink } from "@/components/shared/button-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { db } from "@/lib/db";
import { formatRelative } from "@/lib/datetime";
import { canSeeVoterNames, canViewResults, type ResultsDenial } from "@/lib/poll/permissions";
import { loadPollResults } from "@/lib/poll/results";
import { isPollOpen } from "@/lib/poll/status";
import { readVoterIdentity } from "@/lib/poll/viewer";
import { findViewerResponse, getPollBySlug } from "@/lib/poll/votes";

export async function generateMetadata({ params }: PageProps<"/p/[slug]/results">): Promise<Metadata> {
  const poll = await getPollBySlug((await params).slug);
  if (!poll) return { title: "Poll not found" };
  return { title: `Results: ${poll.title}`, robots: { index: false } };
}

function hiddenMessage(reason: ResultsDenial, closesAt: Date | null, now: Date) {
  switch (reason) {
    case "AFTER_VOTE":
      return { title: "Vote to see the results", body: "The organiser shares results with people who've voted." };
    case "AFTER_CLOSE":
      return {
        title: "Results appear when voting closes",
        body: closesAt
          ? `Voting closes ${formatRelative(closesAt, now)}. Check back then.`
          : "The organiser will close the poll when everyone has voted.",
      };
    case "OWNER_ONLY":
      return { title: "Results are private", body: "Only the organiser can see the results of this poll." };
  }
}

export default async function ResultsPage({ params }: PageProps<"/p/[slug]/results">) {
  const { slug } = await params;
  const poll = await getPollBySlug(slug);
  if (!poll) notFound();

  const identity = await readVoterIdentity();
  const existing =
    identity.userId || identity.voterToken ? await findViewerResponse(db, poll.id, identity) : null;
  const now = new Date();
  const viewer = { userId: identity.userId, isOwner: poll.creatorId === identity.userId, hasVoted: Boolean(existing) };
  const open = isPollOpen(poll, now);
  const access = canViewResults(poll, viewer, now);

  const backLink = (
    <ButtonLink href={`/p/${slug}`} variant="ghost" size="sm" className="self-start">
      <ArrowLeftIcon data-icon="inline-start" aria-hidden />
      {!open ? "Poll" : existing ? "Change your vote" : "Vote"}
    </ButtonLink>
  );

  if (!access.allowed) {
    const message = hiddenMessage(access.reason, poll.closesAt, now);
    return (
      <PageContainer className="flex flex-col gap-6 py-6">
        {backLink}
        <PollHeader poll={poll} isOwner={viewer.isOwner} now={now} />
        <Alert>
          <EyeOffIcon aria-hidden />
          <AlertTitle>{message.title}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            {message.body}
            {access.reason === "AFTER_VOTE" && open && (
              <ButtonLink href={`/p/${slug}`} size="lg" className="h-11">
                Vote now
              </ButtonLink>
            )}
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  const { insights, rows } = await loadPollResults(poll, now);

  return (
    <PageContainer className="flex flex-col gap-6 py-6">
      <div className="flex items-center justify-between gap-3">
        {backLink}
        {open && <AutoRefresh />}
      </div>
      <PollHeader poll={poll} isOwner={viewer.isOwner} now={now} />
      <PollResults
        poll={poll}
        insights={insights}
        rows={rows}
        showNames={canSeeVoterNames(poll, viewer, now)}
        now={now}
        emptyAction={
          open && !existing ? (
            <ButtonLink href={`/p/${slug}`} size="lg" className="h-11">
              Be the first to vote
            </ButtonLink>
          ) : undefined
        }
      />
    </PageContainer>
  );
}
