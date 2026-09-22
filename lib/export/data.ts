import "server-only";
import { db } from "@/lib/db";
import { computeInsights, type PollInsights } from "@/lib/insights";
import { pollShareUrl } from "@/lib/urls";
import { getPollType } from "@/poll-types/registry";

export type ExportResponse = {
  id: string;
  /** Null on anonymous polls. */
  name: string | null;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** One line per response, as the results page words it. */
  summary: string;
  answers: { optionId: string; value: number }[];
};

export type PollExport = Awaited<ReturnType<typeof loadPollExport>>;

/**
 * Everything any export format needs, from one read of the poll: the poll and
 * its options, every response (oldest first), and the same insights the
 * results page shows. The caller has already checked ownership.
 */
export async function loadPollExport(pollId: string, now: Date = new Date()) {
  const poll = await db.poll.findUniqueOrThrow({
    where: { id: pollId },
    include: {
      creator: { select: { name: true } },
      options: { orderBy: { position: "asc" } },
      responses: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          voterName: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
          answers: { select: { optionId: true, value: true } },
        },
      },
    },
  });

  const insights: PollInsights = computeInsights({ poll, options: poll.options, responses: poll.responses, now });
  const definition = getPollType(poll.type);
  const responses: ExportResponse[] = poll.responses.map((response) => ({
    id: response.id,
    name: poll.isAnonymous ? null : response.voterName,
    comment: response.comment,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
    summary: definition.summarizeAnswers(response.answers, { config: poll.config, options: poll.options }),
    answers: response.answers,
  }));

  return {
    poll,
    typeLabel: definition.label,
    url: pollShareUrl(poll.slug),
    responses,
    insights,
    generatedAt: now,
  };
}
