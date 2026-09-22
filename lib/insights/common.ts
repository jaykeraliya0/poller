import { utcDayKey } from "@/lib/datetime";
import { getClosedAt, getPollStatus, type PollStatus } from "@/lib/poll/status";
import { MIN_RESPONSES_FOR_OUTCOME } from "./outcome";
import type { InsightContext } from "./types";

export type ResponseRate = {
  /** Unbounded ratio; above 1 when more people voted than expected. */
  ratio: number;
  percent: number;
  /** Clamped to 0–1 so a progress ring never overflows. */
  ringValue: number;
  exceedsExpected: boolean;
};

export type CommentInsight = {
  id: string;
  text: string;
  /** Null on anonymous polls. */
  author: string | null;
  /** Day-level date (UTC). Anonymous polls get nothing finer, to limit identification. */
  day: string;
  /** Exact time, only on named polls. */
  at: Date | null;
};

export type CommonInsights = {
  status: PollStatus;
  closedAt: Date | null;
  totalResponses: number;
  expectedParticipants: number | null;
  responseRate: ResponseRate | null;
  /** Whether there are enough responses to call a winner and show consensus. */
  hasEnoughData: boolean;
  timeline: { day: string; count: number }[];
  comments: CommentInsight[];
  lastResponseAt: Date | null;
};

export function computeResponseRate(total: number, expected: number | null): ResponseRate | null {
  if (!expected || expected <= 0) return null;
  const ratio = total / expected;
  return {
    ratio,
    percent: Math.round(ratio * 100),
    ringValue: Math.min(ratio, 1),
    exceedsExpected: total > expected,
  };
}

export function computeCommonInsights({ poll, responses, now }: InsightContext): CommonInsights {
  const total = responses.length;

  const perDay = new Map<string, number>();
  for (const response of responses) {
    const day = utcDayKey(response.createdAt);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  const timeline = [...perDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day, count }));

  const comments = responses
    .filter((response) => response.comment?.trim())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map<CommentInsight>((response) => ({
      id: response.id,
      text: response.comment!.trim(),
      author: poll.isAnonymous ? null : response.voterName,
      day: utcDayKey(response.createdAt),
      at: poll.isAnonymous ? null : response.createdAt,
    }));

  const lastResponseAt = responses.reduce<Date | null>(
    (latest, response) => (!latest || response.updatedAt > latest ? response.updatedAt : latest),
    null,
  );

  return {
    status: getPollStatus(poll, now),
    closedAt: getClosedAt(poll, now),
    totalResponses: total,
    expectedParticipants: poll.expectedParticipants,
    responseRate: computeResponseRate(total, poll.expectedParticipants),
    hasEnoughData: total >= MIN_RESPONSES_FOR_OUTCOME,
    timeline,
    comments,
    lastResponseAt,
  };
}
