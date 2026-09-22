import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InboxIcon, MailWarningIcon } from "lucide-react";
import { ResendVerificationButton } from "@/components/account/resend-verification-button";
import { AppPage } from "@/components/layout/app-page";
import { PageHeader } from "@/components/layout/page-header";
import { PollBrowser, type PollSummary } from "@/components/poll/poll-browser";
import { statusLabel } from "@/components/poll/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { requirePageUser } from "@/lib/auth/guards";
import { formatRelative } from "@/lib/datetime";
import { parsePollListParams, pollListHref } from "@/lib/poll/list-params";
import { listPollsSharedWith } from "@/lib/poll/service";
import { getPollStatus } from "@/lib/poll/status";
import { getPollType } from "@/poll-types/registry";

export const metadata: Metadata = { title: "Shared with me" };

const BASE_PATH = "/shared";

export default async function SharedPollsPage({ searchParams }: PageProps<"/shared">) {
  const user = await requirePageUser(BASE_PATH);
  // Invites only match confirmed addresses (see buildViewer), so there's nothing to list yet.
  if (!user.emailVerified) {
    return (
      <AppPage>
        <PageHeader title="Shared with me" />
        <EmptyState
          icon={MailWarningIcon}
          title="Confirm your email to see shared polls"
          description={
            <>
              Polls shared with <strong className="font-medium text-foreground">{user.email}</strong> show up here once
              you&apos;ve followed the link we emailed you.
            </>
          }
        >
          <ResendVerificationButton email={user.email} size="lg" />
        </EmptyState>
      </AppPage>
    );
  }
  const params = parsePollListParams(await searchParams);
  const now = new Date();
  const { polls, total, page, pageCount, counts } = await listPollsSharedWith(user, params, now);
  if (page !== params.page) redirect(pollListHref({ ...params, page }, BASE_PATH));

  const summaries: PollSummary[] = polls.map((poll) => ({
    id: poll.id,
    href: `/p/${poll.slug}`,
    title: poll.title,
    subtitle: `${getPollType(poll.type).label} · by ${poll.creator.name}`,
    isPrivate: poll.visibility === "PRIVATE",
    status: getPollStatus(poll, now),
    statusLabel: statusLabel(poll, now),
    detail: { kind: "vote", voted: poll.responses.length > 0 },
    createdLabel: formatRelative(poll.createdAt, now),
  }));

  return (
    <AppPage>
      <PageHeader
        title="Shared with me"
        description={
          counts.all > 0
            ? "Polls other people invited you to, directly or through one of their groups."
            : undefined
        }
      />
      {counts.all === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="Nothing shared with you yet"
          description={
            <>
              When someone invites <strong className="font-medium text-foreground">{user.email}</strong> to a private
              poll, it shows up here.
            </>
          }
        />
      ) : (
        <PollBrowser
          basePath={BASE_PATH}
          detailHeading="Your vote"
          polls={summaries}
          params={{ ...params, page }}
          counts={counts}
          total={total}
          pageCount={pageCount}
        />
      )}
    </AppPage>
  );
}
