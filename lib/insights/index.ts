import { getPollType, type TypeInsights } from "@/poll-types/registry";
import { computeCommonInsights, type CommonInsights } from "./common";
import { computeStandingsTrend, computeTurnout, type StandingsTrend, type TurnoutPoint } from "./trends";
import type { InsightContext } from "./types";

export type PollInsights = {
  common: CommonInsights;
  byType: TypeInsights;
  trends: { standings: StandingsTrend; turnout: TurnoutPoint[] };
};

/**
 * Insights are a pure function of (poll, options, responses, now). They're
 * computed per request and never stored, so Postgres stays the only source of truth.
 */
export function computeInsights(ctx: InsightContext): PollInsights {
  const common = computeCommonInsights(ctx);
  const byType = getPollType(ctx.poll.type).computeInsights(ctx);
  return {
    common,
    byType,
    trends: { standings: computeStandingsTrend(ctx, byType), turnout: computeTurnout(common.timeline) },
  };
}
