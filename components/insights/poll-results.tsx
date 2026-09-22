import { InboxIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ShowMore } from "@/components/shared/show-more";
import type { PollInsights } from "@/lib/insights";
import type { ResponseRow } from "@/lib/poll/results";
import { TypeResultsView } from "@/poll-types/results-view";
import { CommentsFeed } from "./comments-feed";
import { InsightsHeadline, InsightsStats } from "./insights-summary";
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
  /** Extra panel at the top of the side rail once there are votes, e.g. the share link. */
  rail?: React.ReactNode;
};

/** A titled block of the results board. */
export function BoardSection({
  title,
  count,
  description,
  children,
  id,
}: {
  title: string;
  count?: number;
  description?: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <section aria-labelledby={id} className="panel flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="flex items-baseline gap-2 font-semibold">
          {title}
          {count !== undefined && <span className="text-sm font-normal text-muted-foreground tabular-nums">{count}</span>}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function PollResults({ poll, insights, rows, showNames, now, emptyAction, rail }: PollResultsProps) {
  const { common } = insights;

  if (common.totalResponses === 0) {
    return (
      <EmptyState icon={InboxIcon} title="No votes yet" description="Results and insights will appear here as people vote.">
        {emptyAction}
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <InsightsHeadline insights={insights} />

      {/* Phones read results, then the summary rail, then the (long) voter list. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:items-start">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <BoardSection id="results-heading" title="Results">
            <TypeResultsView insights={insights.byType} totalResponses={common.totalResponses} open={common.status !== "CLOSED"} />
          </BoardSection>
        </div>

        <aside aria-label="Summary" className="flex flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {rail}
          <InsightsStats insights={insights} closesAt={poll.closesAt} now={now} />

          {common.timeline.length >= 2 && (
            <BoardSection id="timeline-heading" title="Responses per day">
              <ResponsesTimeline timeline={common.timeline} />
            </BoardSection>
          )}

          {common.comments.length > 0 && (
            <BoardSection id="comments-heading" title="Comments" count={common.comments.length}>
              <ShowMore
                items={common.comments}
                initial={10}
                noun="comments"
                render={(comments) => <CommentsFeed comments={comments} now={now} />}
              />
            </BoardSection>
          )}
        </aside>

        {showNames && (
          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            <BoardSection id="voters-heading" title="Who voted" count={rows.length} description="Latest first.">
              <ShowMore items={rows} initial={25} noun="voters" render={(items) => <ResponsesList rows={items} now={now} />} />
            </BoardSection>
          </div>
        )}
      </div>
    </div>
  );
}
