import "server-only";
import { cache } from "react";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { AppError, ErrorCode, toFieldErrors, type FieldErrors } from "@/lib/errors";
import { canViewResults, canVote, canWithdrawVote } from "@/lib/poll/permissions";
import { isValidSlug } from "@/lib/poll/slug";
import { voteEnvelopeSchema } from "@/lib/validation/vote";
import { getPollType } from "@/poll-types/registry";

/** Who is voting: always a browser token, plus the account when signed in. */
export type VoterIdentity = {
  userId: string | null;
  userName: string | null;
  voterToken: string;
};

type DbClient = Prisma.TransactionClient | typeof db;

const withAnswers = { answers: { select: { optionId: true, value: true } } } as const;

export async function loadPollBySlug(slug: string) {
  if (!isValidSlug(slug)) return null;
  return db.poll.findUnique({
    where: { slug },
    include: { options: { orderBy: { position: "asc" } } },
  });
}

/** Per-request memoised, so metadata and page share one query. */
export const getPollBySlug = cache(loadPollBySlug);

/**
 * This viewer's existing response: the account's vote first, otherwise this
 * browser's guest vote. A browser vote that belongs to a different account
 * (shared computer) is not theirs.
 */
export async function findViewerResponse(client: DbClient, pollId: string, identity: VoterIdentity) {
  if (identity.userId) {
    const byUser = await client.pollResponse.findUnique({
      where: { pollId_userId: { pollId, userId: identity.userId } },
      include: withAnswers,
    });
    if (byUser) return byUser;
  }
  const byToken = await client.pollResponse.findUnique({
    where: { pollId_voterToken: { pollId, voterToken: identity.voterToken } },
    include: withAnswers,
  });
  if (byToken?.userId && byToken.userId !== identity.userId) return null;
  return byToken;
}

const prefixed = (errors: FieldErrors, prefix: string): FieldErrors =>
  Object.fromEntries(Object.entries(errors).map(([key, value]) => [key === "_form" ? prefix : `${prefix}.${key}`, value]));

export type CastVoteResult = {
  pollId: string;
  slug: string;
  updated: boolean;
  /** Whether this voter may now see the results (drives the post-vote redirect). */
  resultsVisible: boolean;
  /** Differs from the identity's token when this browser's token was taken by another account. */
  voterToken: string;
};

/** Validates and records a vote. Follows the "submit vote" sequence in the design doc. */
export async function castVote(input: unknown, identity: VoterIdentity, now: Date = new Date()): Promise<CastVoteResult> {
  const envelope = voteEnvelopeSchema.safeParse(input);
  if (!envelope.success) {
    throw new AppError(ErrorCode.VALIDATION, undefined, { fieldErrors: toFieldErrors(envelope.error) });
  }
  const { slug, answers, voterName, comment } = envelope.data;

  const poll = await loadPollBySlug(slug);
  if (!poll) throw new AppError(ErrorCode.NOT_FOUND);

  const viewer = { userId: identity.userId, isOwner: poll.creatorId === identity.userId, hasVoted: false };
  const gate = canVote(poll, viewer, now);
  if (!gate.allowed) throw new AppError(gate.reason);

  let fieldErrors: FieldErrors = {};
  const parsedAnswers = getPollType(poll.type)
    .answersSchema({ config: poll.config, options: poll.options })
    .safeParse(answers);
  if (!parsedAnswers.success) fieldErrors = prefixed(toFieldErrors(parsedAnswers.error), "answers");

  // Anonymous polls never store names, even the account name.
  const name = poll.isAnonymous ? null : (voterName ?? identity.userName ?? null);
  if (!poll.isAnonymous && !name) fieldErrors.voterName = ["Enter your name so the organiser knows who voted"];

  if (!parsedAnswers.success || Object.keys(fieldErrors).length > 0) {
    throw new AppError(ErrorCode.VALIDATION, undefined, { fieldErrors });
  }
  const answerRows = parsedAnswers.data;

  const record = () =>
    db.$transaction(async (tx) => {
      const existing = await findViewerResponse(tx, poll.id, identity);

      if (existing) {
        if (!poll.allowVoteChange) throw new AppError(ErrorCode.ALREADY_VOTED);
        await tx.answer.deleteMany({ where: { responseId: existing.id } });
        await tx.pollResponse.update({
          where: { id: existing.id },
          data: {
            voterName: name,
            comment: comment ?? null,
            // A guest vote becomes the account's vote once they sign in.
            userId: existing.userId ?? identity.userId,
            answers: { createMany: { data: answerRows } },
          },
        });
        return { updated: true, voterToken: identity.voterToken };
      }

      // Only a vote by a *different account* on this browser (shared computer) earns a
      // fresh token. Any other holder is this same voter racing themselves (double
      // submit): keep the token so the insert hits the unique constraint and the
      // retry below turns it into an update, instead of recording a second vote.
      const holder = await tx.pollResponse.findUnique({
        where: { pollId_voterToken: { pollId: poll.id, voterToken: identity.voterToken } },
        select: { userId: true },
      });
      const takenByOtherAccount = holder?.userId != null && holder.userId !== identity.userId;
      const voterToken = takenByOtherAccount ? crypto.randomUUID() : identity.voterToken;
      await tx.pollResponse.create({
        data: {
          pollId: poll.id,
          voterToken,
          voterName: name,
          comment: comment ?? null,
          userId: identity.userId,
          answers: { createMany: { data: answerRows } },
        },
      });
      return { updated: false, voterToken };
    });

  const resultsVisible = canViewResults(poll, { ...viewer, hasVoted: true }, now).allowed;
  try {
    return { pollId: poll.id, slug: poll.slug, resultsVisible, ...(await record()) };
  } catch (error) {
    // Double tap / two tabs: the other request inserted first. Run again so this
    // one sees that response and either updates it or reports ALREADY_VOTED.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { pollId: poll.id, slug: poll.slug, resultsVisible, ...(await record()) };
    }
    throw error;
  }
}

export async function withdrawVote(slug: string, identity: VoterIdentity, now: Date = new Date()) {
  const poll = await loadPollBySlug(slug);
  if (!poll) throw new AppError(ErrorCode.NOT_FOUND);

  const existing = await findViewerResponse(db, poll.id, identity);
  const viewer = { userId: identity.userId, isOwner: poll.creatorId === identity.userId, hasVoted: Boolean(existing) };
  const decision = canWithdrawVote(poll, viewer, now);
  if (!decision.allowed) {
    throw new AppError(decision.reason, decision.reason === "NOT_FOUND" ? "You haven't voted on this poll." : undefined);
  }

  await db.pollResponse.delete({ where: { id: existing!.id } });
  return { pollId: poll.id, slug: poll.slug };
}
