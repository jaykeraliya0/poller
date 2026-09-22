import { InboxIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ShowMore } from "@/components/shared/show-more";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PollInsights } from "@/lib/insights";
import type { ResponseRow } from "@/lib/poll/results";
import { TypeResultsView } from "@/poll-types/results-view";
import { CommentsFeed } from "./comments-feed";
import { InsightsSummary } from "./insights-summary";
import { ResponsesList } from "./responses-list";
import { ResponsesTimeline } from "./responses-timeline";

type PollResultsProps = {
  poll: { closesAt: Date | null };
  insights: PollInsights;
  rows: ResponseRow[];
  /** Named polls only, and only where the viewer may see results. */
  showNames: boolean;
  now: Date;
  /** Shown instead of empty charts when there are no votes (e.g. the share link). */
  emptyAction?: React.ReactNode;
};

export function PollResults({ poll, insights, rows, showNames, now, emptyAction }: PollResultsProps) {
  const { common } = insights;

  if (common.totalResponses === 0) {
    return (
      <EmptyState icon={InboxIcon} title="No votes yet" description="Results and insights will appear here as people vote.">
        {emptyAction}
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <InsightsSummary insights={insights} closesAt={poll.closesAt} now={now} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Results</CardTitle>
        </CardHeader>
        <CardContent>
          <TypeResultsView insights={insights.byType} totalResponses={common.totalResponses} open={common.status !== "CLOSED"} />
        </CardContent>
      </Card>

      {common.timeline.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Responses per day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsesTimeline timeline={common.timeline} />
          </CardContent>
        </Card>
      )}

      {common.comments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comments ({common.comments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ShowMore
              items={common.comments}
              initial={10}
              noun="comments"
              render={(comments) => <CommentsFeed comments={comments} now={now} />}
            />
          </CardContent>
        </Card>
      )}

      {showNames && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Who voted ({rows.length})</CardTitle>
            <CardDescription>Latest first.</CardDescription>
          </CardHeader>
          <CardContent>
            <ShowMore items={rows} initial={25} noun="voters" render={(items) => <ResponsesList rows={items} now={now} />} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
