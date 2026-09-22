import "server-only";
import { db } from "@/lib/db";
import { computeInsights } from "@/lib/insights";
import type { InsightOption } from "@/lib/insights/types";
import { getPollType } from "@/poll-types/registry";
import type { Poll } from "@/generated/prisma/client";

export type ResponseRow = { id: string; voterName: string | null; submittedAt: Date; summary: string };

/** Everything the results and manage pages render, computed from Postgres per request. */
export async function loadPollResults(poll: Poll & { options: InsightOption[] }, now: Date = new Date()) {
  const responses = await db.pollResponse.findMany({
    where: { pollId: poll.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      voterName: true,
      comment: true,
      createdAt: true,
      updatedAt: true,
      answers: { select: { optionId: true, value: true } },
    },
  });

  const insights = computeInsights({ poll, options: poll.options, responses, now });
  const definition = getPollType(poll.type);
  const rows: ResponseRow[] = responses.map((response) => ({
    id: response.id,
    voterName: response.voterName,
    submittedAt: response.updatedAt,
    summary: definition.summarizeAnswers(response.answers, { config: poll.config, options: poll.options }),
  }));

  return { insights, rows };
}
