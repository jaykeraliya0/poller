import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChartColumnIcon, CircleCheckIcon, LockIcon, LogInIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PollHeader } from "@/components/poll/poll-header";
import { ButtonLink } from "@/components/shared/button-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AnswerSummary } from "@/components/vote/answer-summary";
import { VoteForm } from "@/components/vote/vote-form";
import { formatRelative } from "@/lib/datetime";
import { db } from "@/lib/db";
import { canViewResults, canViewVotePage } from "@/lib/poll/permissions";
import { getClosedAt } from "@/lib/poll/status";
import { readVoterIdentity } from "@/lib/poll/viewer";
import { findViewerResponse, getPollBySlug } from "@/lib/poll/votes";
import { getPollType } from "@/poll-types/registry";

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const poll = await getPollBySlug((await params).slug);
  if (!poll) return { title: "Poll not found" };
  // Polls are private-by-link: keep them out of search engines.
  return { title: poll.title, description: poll.description ?? "Cast your vote", robots: { index: false } };
}

export default async function VotePage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const poll = await getPollBySlug(slug);
  if (!poll) notFound();

  const identity = await readVoterIdentity();
  const existing =
    identity.userId || identity.voterToken ? await findViewerResponse(db, poll.id, identity) : null;
  const now = new Date();
  const isOwner = poll.creatorId === identity.userId;
  const closedAt = getClosedAt(poll, now);

  const yourVote = existing && (
    <section aria-labelledby="your-vote-heading" className="panel flex flex-col gap-4 p-4 sm:p-5">
      <h2 id="your-vote-heading" className="font-display text-lg font-bold">
        Your vote
      </h2>
      <AnswerSummary type={poll.type} config={poll.config} options={poll.options} rows={existing.answers} />
      {existing.comment && <p className="border-l-2 border-signal-soft pl-3 text-sm text-muted-foreground">{existing.comment}</p>}
    </section>
  );

  let body: React.ReactNode;
  if (!canViewVotePage(poll, { userId: identity.userId, isOwner, hasVoted: false }).allowed) {
    body = (
      <Alert className="max-w-2xl">
        <LockIcon aria-hidden />
        <AlertTitle>Sign in to vote</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          The organiser asked voters to sign in, so everyone votes only once.
          <ButtonLink href={`/login?next=${encodeURIComponent(`/p/${slug}`)}`} size="lg">
            <LogInIcon data-icon="inline-start" aria-hidden />
            Sign in
          </ButtonLink>
        </AlertDescription>
      </Alert>
    );
  } else if (closedAt) {
    body = (
      <div className="flex max-w-2xl flex-col gap-4">
        <Alert>
          <LockIcon aria-hidden />
          <AlertTitle>This poll is closed</AlertTitle>
          <AlertDescription>
            Voting ended {formatRelative(closedAt, now)}.
            {existing ? " Here's how you voted." : ""}
          </AlertDescription>
        </Alert>
        {yourVote}
      </div>
    );
  } else if (existing && !poll.allowVoteChange) {
    body = (
      <div className="flex max-w-2xl flex-col gap-4">
        <Alert>
          <CircleCheckIcon aria-hidden />
          <AlertTitle>You&apos;ve voted</AlertTitle>
          <AlertDescription>This poll doesn&apos;t allow changing votes.</AlertDescription>
        </Alert>
        {yourVote}
      </div>
    );
  } else {
    const newOptionIds = existing
      ? poll.options.filter((option) => option.createdAt > existing.updatedAt).map((option) => option.id)
      : [];
    body = (
      <>
        {existing && (
          <Alert className="border-signal/25 bg-signal-wash">
            <CircleCheckIcon aria-hidden className="text-signal" />
            <AlertTitle>You voted {formatRelative(existing.updatedAt, now)}</AlertTitle>
            <AlertDescription>
              {newOptionIds.length > 0
                ? "New options were added since then. Take a look and update your vote."
                : "You can change your answers until the poll closes."}
            </AlertDescription>
          </Alert>
        )}
        <VoteForm
          // Remount after voting or withdrawing so the form reflects the saved vote.
          key={existing ? `${existing.id}-${existing.updatedAt.getTime()}` : "new"}
          poll={{
            slug: poll.slug,
            type: poll.type,
            config: poll.config,
            isAnonymous: poll.isAnonymous,
            allowVoteChange: poll.allowVoteChange,
          }}
          options={poll.options}
          initialAnswers={existing ? getPollType(poll.type).toAnswerInput(existing.answers) : null}
          initialName={existing?.voterName ?? identity.userName ?? ""}
          initialComment={existing?.comment ?? ""}
          hasVoted={Boolean(existing)}
          newOptionIds={newOptionIds}
        />
      </>
    );
  }

  const resultsVisible = canViewResults(poll, { userId: identity.userId, isOwner, hasVoted: Boolean(existing) }, now).allowed;

  return (
    <PageContainer className="flex flex-col gap-7 py-7 lg:py-10">
      <PollHeader
        poll={poll}
        isOwner={isOwner}
        now={now}
        actions={
          resultsVisible && (
            <ButtonLink href={`/p/${slug}/results`} variant="outline" size="lg">
              <ChartColumnIcon data-icon="inline-start" aria-hidden />
              See results
            </ButtonLink>
          )
        }
      />
      {body}
    </PageContainer>
  );
}
