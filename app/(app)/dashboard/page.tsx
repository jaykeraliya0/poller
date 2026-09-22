import type { Metadata } from "next";
import { AppPage } from "@/components/layout/app-page";
import { PageHeader } from "@/components/layout/page-header";
import { PollBrowser, type PollSummary } from "@/components/poll/poll-browser";
import { statusLabel } from "@/components/poll/status-badge";
import { TemplateGrid } from "@/components/poll/template-card";
import { QueryToast } from "@/components/shared/query-toast";
import { requirePageUser } from "@/lib/auth/guards";
import { formatRelative } from "@/lib/datetime";
import { getPollStatus } from "@/lib/poll/status";
import { listPollsForOwner } from "@/lib/poll/service";
import { POLL_TEMPLATES } from "@/lib/poll/templates";
import { getPollType } from "@/poll-types/registry";

export const metadata: Metadata = { title: "My polls" };

export default async function DashboardPage() {
  const user = await requirePageUser("/dashboard");
  const polls = await listPollsForOwner(user.id);
  const now = new Date();

  // Status and relative times come from server time, so the list renders the same on both sides.
  const summaries: PollSummary[] = polls.map((poll) => ({
    id: poll.id,
    title: poll.title,
    typeLabel: getPollType(poll.type).label,
    status: getPollStatus(poll, now),
    statusLabel: statusLabel(poll, now),
    responses: poll._count.responses,
    expected: poll.expectedParticipants,
    createdLabel: formatRelative(poll.createdAt, now),
  }));
  const openCount = summaries.filter((poll) => poll.status !== "CLOSED").length;

  return (
    <AppPage>
      <QueryToast param="deleted" value="1" message="Poll deleted" />

      {polls.length === 0 ? (
        <>
          <PageHeader title="My polls" />
          <section aria-labelledby="empty-heading" className="panel flex flex-col gap-6 p-5 sm:p-7">
            <div className="flex flex-col gap-1.5">
              <h2 id="empty-heading" className="font-display text-xl font-bold">
                No polls yet
              </h2>
              <p className="text-muted-foreground">Pick a starting point. You can change everything before you share it.</p>
            </div>
            <TemplateGrid templates={POLL_TEMPLATES} />
          </section>
        </>
      ) : (
        <>
          <PageHeader
            title="My polls"
            description={
              openCount > 0
                ? `${openCount} of your ${polls.length} polls ${openCount === 1 ? "is" : "are"} taking votes.`
                : "None of your polls are taking votes right now."
            }
          />
          <PollBrowser polls={summaries} />
        </>
      )}
    </AppPage>
  );
}
