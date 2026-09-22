import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { canReopen, isPollOpen } from "./status";
import { createSlug } from "./slug";
import { parsePollSubmission } from "./submission";

const SLUG_ATTEMPTS = 3;

export async function createPoll(creatorId: string, input: unknown) {
  const parsed = parsePollSubmission(input);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, undefined, { fieldErrors: parsed.fieldErrors });
  }
  const { settings, options, ...poll } = parsed.data;

  // Slugs are random; retry the (astronomically rare) collision instead of failing.
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.poll.create({
        data: {
          ...poll,
          ...settings,
          creatorId,
          slug: createSlug(),
          options: { create: options },
        },
        select: { id: true, slug: true },
      });
    } catch (error) {
      const slugTaken =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!slugTaken || attempt >= SLUG_ATTEMPTS) throw error;
    }
  }
}

export async function listPollsForOwner(creatorId: string) {
  return db.poll.findMany({
    where: { creatorId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      closesAt: true,
      closedAt: true,
      createdAt: true,
      expectedParticipants: true,
      _count: { select: { responses: true } },
    },
  });
}

/** Closes an open poll now. The owner check happens in the caller (requireOwner). */
export async function closePoll(pollId: string, now: Date = new Date()) {
  const poll = await db.poll.findUniqueOrThrow({ where: { id: pollId } });
  if (!isPollOpen(poll, now)) throw new AppError(ErrorCode.ALREADY_CLOSED);
  // Conditional update so two concurrent closes can't both "succeed".
  const { count } = await db.poll.updateMany({ where: { id: pollId, closedAt: null }, data: { closedAt: now } });
  if (count === 0) throw new AppError(ErrorCode.ALREADY_CLOSED);
  return poll;
}

/** Reopens a manually closed poll whose deadline (if any) is still ahead. */
export async function reopenPoll(pollId: string, now: Date = new Date()) {
  const poll = await db.poll.findUniqueOrThrow({ where: { id: pollId } });
  if (!canReopen(poll, now)) {
    throw new AppError(
      ErrorCode.CONFLICT,
      poll.closedAt ? "The deadline has passed. Set a new deadline to reopen this poll." : "This poll is already open.",
    );
  }
  await db.poll.update({ where: { id: pollId }, data: { closedAt: null } });
  return poll;
}
