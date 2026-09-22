import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppPage } from "@/components/layout/app-page";
import { PageHeader } from "@/components/layout/page-header";
import { PollBrowser, type PollSummary } from "@/components/poll/poll-browser";
import { statusLabel } from "@/components/poll/status-badge";
import { TemplateGrid } from "@/components/poll/template-card";
import { QueryToast } from "@/components/shared/query-toast";
import { requirePageUser } from "@/lib/auth/guards";
import { formatRelative } from "@/lib/datetime";
import { parsePollListParams, pollListHref } from "@/lib/poll/list-params";
import { getPollStatus } from "@/lib/poll/status";
import { listPollsForOwner } from "@/lib/poll/service";
import { POLL_TEMPLATES } from "@/lib/poll/templates";
import { getPollType } from "@/poll-types/registry";

export const metadata: Metadata = { title: "My polls" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requirePageUser("/dashboard");
  const params = parsePollListParams(await searchParams);
  const now = new Date();
  const { polls, total, page, pageCount, counts } = await listPollsForOwner(user.id, params, now);
  // A page past the end (say, after deleting its last poll) lands on the real last page.
  if (page !== params.page) redirect(pollListHref({ ...params, page }));

  // Status and relative times come from server time, so the list renders the same on both sides.
  const summaries: PollSummary[] = polls.map((poll) => ({
    id: poll.id,
    href: `/polls/${poll.id}/manage`,
    title: poll.title,
    subtitle: getPollType(poll.type).label,
    isPrivate: poll.visibility === "PRIVATE",
    status: getPollStatus(poll, now),
    statusLabel: statusLabel(poll, now),
    detail: { kind: "turnout", responses: poll._count.responses, expected: poll.expectedParticipants },
    createdLabel: formatRelative(poll.createdAt, now),
  }));

  return (
    <AppPage>
      <QueryToast param="deleted" value="1" message="Poll deleted" />

      {counts.all === 0 ? (
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
              counts.open > 0
                ? `${counts.open} of your ${counts.all} polls ${counts.open === 1 ? "is" : "are"} taking votes.`
                : "None of your polls are taking votes right now."
            }
          />
          <PollBrowser
            basePath="/dashboard"
            detailHeading="Responses"
            polls={summaries} params={{ ...params, page }} counts={counts} total={total} pageCount={pageCount} />
        </>
      )}
    </AppPage>
  );
}
