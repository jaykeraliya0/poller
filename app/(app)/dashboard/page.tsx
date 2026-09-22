import type { Metadata } from "next";
import { PlusIcon, VoteIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PollListItem } from "@/components/poll/poll-list-item";
import { ButtonLink } from "@/components/shared/button-link";
import { EmptyState } from "@/components/shared/empty-state";
import { requirePageUser } from "@/lib/auth/guards";
import { listPollsForOwner } from "@/lib/poll/service";

export const metadata: Metadata = { title: "My polls" };

export default async function DashboardPage() {
  const user = await requirePageUser("/dashboard");
  const polls = await listPollsForOwner(user.id);
  const now = new Date();

  return (
    <PageContainer className="py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">My polls</h1>

      {polls.length === 0 ? (
        <EmptyState
          icon={VoteIcon}
          title="No polls yet"
          description="Create your first poll and share the link with your group."
        >
          <ButtonLink href="/polls/new" size="lg" className="h-11">
            <PlusIcon data-icon="inline-start" aria-hidden />
            Create a poll
          </ButtonLink>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {polls.map((poll) => (
            <li key={poll.id}>
              <PollListItem poll={poll} now={now} />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
