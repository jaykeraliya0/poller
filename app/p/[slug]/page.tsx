import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CircleCheckIcon, LockIcon, LogInIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PollHeader } from "@/components/poll/poll-header";
import { ButtonLink } from "@/components/shared/button-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VoteForm } from "@/components/vote/vote-form";
import { formatRelative } from "@/lib/datetime";
import { db } from "@/lib/db";
import { canViewVotePage } from "@/lib/poll/permissions";
import { getClosedAt } from "@/lib/poll/status";
import { readVoterIdentity } from "@/lib/poll/viewer";
import { findViewerResponse, loadPollBySlug } from "@/lib/poll/votes";
import { getPollType } from "@/poll-types/registry";
import { getPollTypeVoteUI } from "@/poll-types/vote-inputs";

const getPoll = cache(loadPollBySlug);

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const poll = await getPoll((await params).slug);
  if (!poll) return { title: "Poll not found" };
  // Polls are private-by-link: keep them out of search engines.
  return { title: poll.title, description: poll.description ?? "Cast your vote", robots: { index: false } };
}

export default async function VotePage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const poll = await getPoll(slug);
  if (!poll) notFound();

  const identity = await readVoterIdentity();
  const existing =
    identity.userId || identity.voterToken ? await findViewerResponse(db, poll.id, identity) : null;
  const now = new Date();
  const isOwner = poll.creatorId === identity.userId;
  const closedAt = getClosedAt(poll, now);
  const { AnswerSummary } = getPollTypeVoteUI(poll.type);

  const yourVote = existing && (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your vote</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <AnswerSummary config={poll.config} options={poll.options} rows={existing.answers} />
        {existing.comment && <p className="border-l-2 pl-3 text-sm text-muted-foreground">{existing.comment}</p>}
      </CardContent>
    </Card>
  );

  let body: React.ReactNode;
  if (!canViewVotePage(poll, { userId: identity.userId, isOwner, hasVoted: false }).allowed) {
    body = (
      <Alert>
        <LockIcon aria-hidden />
        <AlertTitle>Sign in to vote</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          The organiser asked voters to sign in, so everyone votes only once.
          <ButtonLink href={`/login?next=${encodeURIComponent(`/p/${slug}`)}`} size="lg" className="h-11">
            <LogInIcon data-icon="inline-start" aria-hidden />
            Sign in
          </ButtonLink>
        </AlertDescription>
      </Alert>
    );
  } else if (closedAt) {
    body = (
      <>
        <Alert>
          <LockIcon aria-hidden />
          <AlertTitle>This poll is closed</AlertTitle>
          <AlertDescription>
            Voting ended {formatRelative(closedAt, now)}.
            {existing ? " Here's how you voted." : ""}
          </AlertDescription>
        </Alert>
        {yourVote}
      </>
    );
  } else if (existing && !poll.allowVoteChange) {
    body = (
      <>
        <Alert>
          <CircleCheckIcon aria-hidden />
          <AlertTitle>You&apos;ve voted</AlertTitle>
          <AlertDescription>This poll doesn&apos;t allow changing votes.</AlertDescription>
        </Alert>
        {yourVote}
      </>
    );
  } else {
    const newOptionIds = existing
      ? poll.options.filter((option) => option.createdAt > existing.updatedAt).map((option) => option.id)
      : [];
    body = (
      <>
        {existing && (
          <Alert>
            <CircleCheckIcon aria-hidden />
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

  return (
    <PageContainer className="flex flex-col gap-6 py-6">
      <PollHeader poll={poll} isOwner={isOwner} now={now} />
      {body}
    </PageContainer>
  );
}
