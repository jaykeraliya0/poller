import { InboxIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ShowMore } from "@/components/shared/show-more";
import type { PollInsights } from "@/lib/insights";
import type { ResponseRow } from "@/lib/poll/results";
import { TypeAnalysisView } from "@/poll-types/analysis-view";
import { TypeResultsView } from "@/poll-types/results-view";
import { StandingsChart, TurnoutChart } from "./analysis/trend-charts";
import { BoardSection } from "./board-section";
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

export function PollResults({ poll, insights, rows, showNames, now, emptyAction, rail }: PollResultsProps) {
  const { common, trends } = insights;
  const { standings } = trends;

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

      {/* Phones read results, the summary rail, the analysis, then the (long) voter list. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_auto_1fr] lg:items-start">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <BoardSection id="results-heading" title="Results">
            <TypeResultsView insights={insights.byType} totalResponses={common.totalResponses} open={common.status !== "CLOSED"} />
          </BoardSection>
        </div>

        <aside aria-label="Summary" className="flex flex-col gap-4 lg:col-start-2 lg:row-span-3 lg:row-start-1">
          {rail}
          <InsightsStats insights={insights} closesAt={poll.closesAt} now={now} />

          {common.timeline.length >= 2 && (
            <BoardSection id="timeline-heading" title="Responses per day">
              <ResponsesTimeline timeline={common.timeline} />
            </BoardSection>
          )}

          {trends.turnout.length >= 2 && (
            <BoardSection
              id="turnout-heading"
              title="Turnout"
              description={common.expectedParticipants ? "Total responses, against the expected head count." : "Total responses so far."}
            >
              <TurnoutChart turnout={trends.turnout} expected={common.expectedParticipants} />
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

        {/* Hidden until a panel renders: some polls have nothing extra to show yet. */}
        <section aria-labelledby="analysis-heading" className="hidden min-w-0 flex-col gap-3 has-[.panel]:flex lg:col-start-1 lg:row-start-2">
          <h2 id="analysis-heading" className="font-display pt-2 text-lg font-bold">
            Analysis
          </h2>
          {/* Two columns on wide screens; each type's panels either pair up or span both. */}
          <div className="grid gap-4 xl:grid-cols-2">
            {standings.points.length >= 2 && standings.series.length >= 2 && (
              <BoardSection
                id="analysis-standings-heading"
                title="Standings over time"
                description={`${standings.metric.label} at the end of each day${
                  standings.hidden > 0 ? `, for the top ${standings.series.length} options` : ""
                }. Uses each voter's current answers.`}
                className="xl:col-span-2"
              >
                <StandingsChart trend={standings} />
              </BoardSection>
            )}
            <TypeAnalysisView insights={insights.byType} totalResponses={common.totalResponses} />
          </div>
        </section>

        {showNames && (
          <div className="min-w-0 lg:col-start-1 lg:row-start-3">
            <BoardSection id="voters-heading" title="Who voted" count={rows.length} description="Latest first.">
              <ShowMore items={rows} initial={25} noun="voters" render={(items) => <ResponsesList rows={items} now={now} />} />
            </BoardSection>
          </div>
        )}
      </div>
    </div>
  );
}
