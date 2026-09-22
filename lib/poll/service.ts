import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { AppError, ErrorCode, type FieldErrors } from "@/lib/errors";
import { stableStringify } from "@/lib/json";
import { canReopen, isPollOpen } from "./status";
import { createSlug } from "./slug";
import { parsePollSubmission, type PollSubmission } from "./submission";

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

/**
 * Applies an edit from the owner. Once people have voted, the type, the type's
 * config and anonymity are locked, voted options can't be removed, and
 * existing time slots keep their times: all of these would change what
 * earlier votes mean. Adding, renaming and reordering options stays allowed.
 */
export async function updatePoll(pollId: string, input: unknown, now: Date = new Date()) {
  const existing = await db.poll.findUniqueOrThrow({
    where: { id: pollId },
    include: {
      options: { include: { _count: { select: { answers: true } } } },
      _count: { select: { responses: true } },
    },
  });
  const hasVotes = existing._count.responses > 0;
  const raw = (typeof input === "object" && input !== null ? input : {}) as Partial<PollSubmission>;

  // An unchanged deadline may already be in the past; only a new one must be in the future.
  const submittedDeadline = raw.settings?.closesAt ? new Date(raw.settings.closesAt).getTime() : null;
  const keepDeadline = existing.closesAt !== null && submittedDeadline === existing.closesAt.getTime();

  const parsed = parsePollSubmission({
    ...raw,
    type: existing.type,
    template: existing.template,
    settings: raw.settings && { ...raw.settings, closesAt: keepDeadline ? null : raw.settings.closesAt },
  });
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, undefined, { fieldErrors: parsed.fieldErrors });
  const { title, description, config, options, settings } = parsed.data;
  const closesAt = keepDeadline ? existing.closesAt : settings.closesAt;

  const fieldErrors: FieldErrors = {};
  if (hasVotes && stableStringify(config) !== stableStringify(existing.config)) {
    fieldErrors.config = ["These settings are locked because people have already voted."];
  }
  if (hasVotes && settings.isAnonymous !== existing.isAnonymous) {
    fieldErrors["settings.isAnonymous"] = ["Anonymity can't change after people have voted."];
  }

  const existingById = new Map(existing.options.map((option) => [option.id, option]));
  const keptIds = new Set(options.flatMap((option) => (option.id ? [option.id] : [])));
  if ([...keptIds].some((id) => !existingById.has(id))) {
    fieldErrors.options = ["Some options no longer exist. Reload the page and try again."];
  }
  const removed = existing.options.filter((option) => !keptIds.has(option.id));
  const votedRemovals = removed.filter((option) => option._count.answers > 0);
  if (votedRemovals.length > 0) {
    fieldErrors.options = votedRemovals.map((option) => `"${option.label}" already has votes, so it can't be removed.`);
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new AppError(ErrorCode.VALIDATION, undefined, { fieldErrors });
  }

  const isSlot = existing.type === "AVAILABILITY";
  await db.$transaction(async (tx) => {
    await tx.poll.update({
      where: { id: pollId },
      data: {
        title,
        description: description ?? null,
        ...(!hasVotes && { config }),
        ...settings,
        closesAt,
      },
    });

    if (removed.length > 0) {
      // Guarded delete: if someone voted on an option in the meantime, abort instead of dropping their vote.
      const { count } = await tx.pollOption.deleteMany({
        where: { id: { in: removed.map((option) => option.id) }, pollId, answers: { none: {} } },
      });
      if (count !== removed.length) {
        throw new AppError(ErrorCode.CONFLICT, "Someone just voted on an option you removed. Reload and try again.");
      }
    }

    for (const option of options) {
      if (option.id) {
        await tx.pollOption.update({
          where: { id: option.id },
          // Slots keep their stored times (and so their label); labelled options can be renamed.
          data: isSlot ? { position: option.position } : { position: option.position, label: option.label },
        });
      } else {
        await tx.pollOption.create({
          data: { pollId, label: option.label, position: option.position, startsAt: option.startsAt, endsAt: option.endsAt },
        });
      }
    }
  });

  // A new future deadline reopens a poll that had closed because its old deadline passed.
  const reopened = !isPollOpen(existing, now) && isPollOpen({ ...existing, closesAt }, now);
  return { id: existing.id, slug: existing.slug, reopened };
}

export async function deletePoll(pollId: string) {
  await db.poll.delete({ where: { id: pollId } });
}

/** Deletes the account: their polls (and every vote on them) go too; their votes elsewhere stay, unlinked. */
export async function deleteAccount(user: { id: string; email: string }, confirmation: unknown) {
  if (typeof confirmation !== "string" || confirmation.trim().toLowerCase() !== user.email.toLowerCase()) {
    throw new AppError(ErrorCode.VALIDATION, undefined, {
      fieldErrors: { confirmation: ["Type your email exactly to confirm"] },
    });
  }
  await db.user.delete({ where: { id: user.id } });
}
