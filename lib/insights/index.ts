import { getPollType, type TypeInsights } from "@/poll-types/registry";
import { computeCommonInsights, type CommonInsights } from "./common";
import type { InsightContext } from "./types";

export type PollInsights = {
  common: CommonInsights;
  byType: TypeInsights;
};

/**
 * Insights are a pure function of (poll, options, responses, now). They're
 * computed per request and never stored, so Postgres stays the only source of truth.
 */
export function computeInsights(ctx: InsightContext): PollInsights {
  return {
    common: computeCommonInsights(ctx),
    byType: getPollType(ctx.poll.type).computeInsights(ctx),
  };
}
