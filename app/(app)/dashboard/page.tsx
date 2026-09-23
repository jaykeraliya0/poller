import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppPage } from "@/components/layout/app-page";
import { PageHeader } from "@/components/layout/page-header";
import { PollBrowser, type PollSummary } from "@/components/poll/poll-browser";
import { statusLabel } from "@/components/poll/status-badge";
import { TemplateGrid } from "@/components/poll/template-card";
import { QueryToast } from "@/components/shared/query-toast";
import { requirePageUser, type CurrentUser } from "@/lib/auth/guards";
import { formatRelative } from "@/lib/datetime";
import {
  POLL_FILTERS,
  POLL_SCOPES,
  parsePollListParams,
  pollListHref,
  type PollListParams,
} from "@/lib/poll/list-params";
import { canViewResults, type Viewer } from "@/lib/poll/permissions";
import { getPollStatus } from "@/lib/poll/status";
import { countOwnedPolls, countVotedPolls, listPollsForOwner, listPollsVotedOn } from "@/lib/poll/service";
import { POLL_TEMPLATES } from "@/lib/poll/templates";
import { getPollType } from "@/poll-types/registry";

export const metadata: Metadata = { title: "My polls" };

const BASE_PATH = "/dashboard";

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requirePageUser(BASE_PATH);
  const parsed = parsePollListParams(await searchParams, POLL_FILTERS, POLL_SCOPES);
  // Archiving is the owner's own filing, so it isn't a tab on the voted list.
  const params: PollListParams =
    parsed.scope === "voted" && parsed.filter === "archived" ? { ...parsed, filter: "all" } : parsed;
  const now = new Date();

  return params.scope === "voted" ? (
    <VotedPolls user={user} params={params} now={now} />
  ) : (
    <OwnPolls user={user} params={params} now={now} />
  );
}

type ScopeProps = { user: CurrentUser; params: PollListParams; now: Date };

async function OwnPolls({ user, params, now }: ScopeProps) {
  const [{ polls, total, page, pageCount, counts }, votedCount] = await Promise.all([
    listPollsForOwner(user.id, params, now),
    countVotedPolls(user),
  ]);
  // A page past the end (say, after deleting its last poll) lands on the real last page.
  if (page !== params.page) redirect(pollListHref({ ...params, page }, BASE_PATH));

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

  const scopes = scopeTabs(counts.all, votedCount);

  return (
    <AppPage>
      <QueryToast param="deleted" value="1" message="Poll deleted" />
      <QueryToast param="archived" value="1" message="Poll archived. Find it under Archived." />
      <QueryToast param="verified" value="1" message="Email confirmed" />

      {counts.all + counts.archived === 0 && votedCount === 0 ? (
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
            basePath={BASE_PATH}
            detailHeading="Responses"
            polls={summaries}
            params={{ ...params, page }}
            counts={counts}
            total={total}
            pageCount={pageCount}
            filters={["all", "open", "closed", "archived"]}
            scopes={scopes}
            selectable
          />
        </>
      )}
    </AppPage>
  );
}

async function VotedPolls({ user, params, now }: ScopeProps) {
  const [{ polls, total, page, pageCount, counts }, ownedCount] = await Promise.all([
    listPollsVotedOn(user, params, now),
    countOwnedPolls(user.id),
  ]);
  if (page !== params.page) redirect(pollListHref({ ...params, page }, BASE_PATH));

  const summaries: PollSummary[] = polls.map((poll) => {
    const response = poll.responses[0];
    // The scope query already proved current access, so only the results rule is left to check.
    const viewer: Viewer = {
      userId: user.id,
      isOwner: poll.creatorId === user.id,
      hasVoted: true,
      isInvited: true,
      emailVerified: user.emailVerified,
    };
    const definition = getPollType(poll.type);
    const subtitle = [
      definition.label,
      `by ${poll.creator.name}`,
      canViewResults(poll, viewer, now).allowed
        ? `${poll._count.responses} ${poll._count.responses === 1 ? "response" : "responses"}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      id: poll.id,
      href: `/p/${poll.slug}`,
      title: poll.title,
      subtitle,
      isPrivate: poll.visibility === "PRIVATE",
      status: getPollStatus(poll, now),
      statusLabel: statusLabel(poll, now),
      detail: {
        kind: "choice",
        summary: definition.summarizeAnswers(response.answers, { config: poll.config, options: poll.options }),
      },
      // updatedAt, so changing a vote moves it to the time it last said something.
      createdLabel: formatRelative(response.updatedAt, now),
    };
  });

  return (
    <AppPage>
      <PageHeader
        title="Voted"
        description={
          counts.all > 0
            ? `You've voted in ${counts.all} ${counts.all === 1 ? "poll" : "polls"}.`
            : undefined
        }
      />
      <PollBrowser
        basePath={BASE_PATH}
        detailHeading="Your vote"
        createdHeading="Voted"
        polls={summaries}
        params={{ ...params, page }}
        counts={counts}
        total={total}
        pageCount={pageCount}
        scopes={scopeTabs(ownedCount, counts.all)}
        emptyMessage="You haven't voted in any polls yet."
      />
    </AppPage>
  );
}

const scopeTabs = (mine: number, voted: number) =>
  [
    { value: "mine", label: "My polls", count: mine },
    { value: "voted", label: "Voted", count: voted },
  ] as const;
