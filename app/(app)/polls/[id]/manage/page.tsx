import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, UsersIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { SharePanel } from "@/components/poll/share-panel";
import { ShareSheet } from "@/components/poll/share-sheet";
import { StatusBadge } from "@/components/poll/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageOwner } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { plural } from "@/lib/insights/outcome";
import { getPollType } from "@/poll-types/registry";
import { pollShareUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "Manage poll" };

// Insights, close/reopen and comments arrive in Phase 5; this is the landing spot after creating.
export default async function ManagePollPage({ params, searchParams }: PageProps<"/polls/[id]/manage">) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const { poll } = await requirePageOwner(id, `/polls/${id}/manage`);
  const responses = await db.pollResponse.count({ where: { pollId: poll.id } });
  const shareUrl = pollShareUrl(poll.slug);

  return (
    <PageContainer className="flex flex-col gap-6 py-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        My polls
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge poll={poll} />
          <span className="text-xs text-muted-foreground">{getPollType(poll.type).label}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight break-words">{poll.title}</h1>
        {poll.description && <p className="text-muted-foreground">{poll.description}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <ShareSheet url={shareUrl} title={poll.title} defaultOpen={created === "1"} />
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <UsersIcon className="size-4" aria-hidden />
            {plural(responses, "response")}
          </span>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite people to vote</CardTitle>
          <CardDescription>Results and insights will appear here as votes come in.</CardDescription>
        </CardHeader>
        <CardContent>
          <SharePanel url={shareUrl} title={poll.title} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
