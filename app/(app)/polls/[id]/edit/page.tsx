import type { Metadata } from "next";
import { InfoIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { BackLink } from "@/components/shared/back-link";
import { PollFormLoader } from "@/components/poll-form/poll-form-loader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requirePageOwner } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { plural } from "@/lib/insights/outcome";

export const metadata: Metadata = { title: "Edit poll", robots: { index: false } };

export default async function EditPollPage({ params }: PageProps<"/polls/[id]/edit">) {
  const { id } = await params;
  const { poll } = await requirePageOwner(id, `/polls/${id}/edit`);
  const [options, responseCount] = await Promise.all([
    db.pollOption.findMany({
      where: { pollId: poll.id },
      orderBy: { position: "asc" },
      select: { id: true, label: true, startsAt: true, endsAt: true, _count: { select: { answers: true } } },
    }),
    db.pollResponse.count({ where: { pollId: poll.id } }),
  ]);

  return (
    <PageContainer className="flex flex-col gap-6 py-6">
      <BackLink href={`/polls/${poll.id}/manage`}>Back to results</BackLink>
      <h1 className="text-2xl font-semibold tracking-tight">Edit poll</h1>
      {responseCount > 0 && (
        <Alert>
          <InfoIcon aria-hidden />
          <AlertDescription>
            {plural(responseCount, "person has", "people have")} voted. You can still add, rename and reorder
            options and change most settings. Options with votes can&apos;t be removed, and the poll type&apos;s own
            settings and anonymity are locked so earlier votes keep their meaning.
          </AlertDescription>
        </Alert>
      )}
      <PollFormLoader
        mode="edit"
        poll={{
          id: poll.id,
          type: poll.type,
          template: poll.template,
          title: poll.title,
          description: poll.description,
          config: poll.config,
          options: options.map(({ id, label, startsAt, endsAt }) => ({ id, label, startsAt, endsAt })),
          closesAt: poll.closesAt,
          allowVoteChange: poll.allowVoteChange,
          isAnonymous: poll.isAnonymous,
          requireLogin: poll.requireLogin,
          resultsVisibility: poll.resultsVisibility,
          expectedParticipants: poll.expectedParticipants,
          responseCount,
          votedOptionIds: options.filter((option) => option._count.answers > 0).map((option) => option.id),
        }}
      />
    </PageContainer>
  );
}
