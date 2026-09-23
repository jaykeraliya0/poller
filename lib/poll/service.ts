import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { AppError, ErrorCode, validationError, type FieldErrors } from "@/lib/errors";
import { stableStringify } from "@/lib/json";
import { pollSettingsSchema } from "@/lib/validation/poll";
import { POLLS_PER_PAGE, type PollFilter, type PollListParams } from "./list-params";
import { deadlinePassed, isPollOpen } from "./status";
import { createSlug } from "./slug";
import { parsePollSubmission, type PollSubmission } from "./submission";

const SLUG_ATTEMPTS = 3;
const CLOSED_EDIT_MESSAGE = "This poll is closed. Reopen it to make changes.";
const ARCHIVED_MESSAGE = "This poll is archived. Unarchive it first.";

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

/** Prisma filter matching the polls getPollStatus would call open or closed at `now`. */
function statusWhere(filter: Exclude<PollFilter, "archived">, now: Date): Prisma.PollWhereInput {
  if (filter === "closed") return { OR: [{ closedAt: { lte: now } }, { closesAt: { lte: now } }] };
  if (filter === "open") {
    return {
      AND: [
        { OR: [{ closedAt: null }, { closedAt: { gt: now } }] },
        { OR: [{ closesAt: null }, { closesAt: { gt: now } }] },
      ],
    };
  }
  return {};
}

const pollListSelect = {
  id: true,
  slug: true,
  title: true,
  type: true,
  visibility: true,
  closesAt: true,
  closedAt: true,
  createdAt: true,
  expectedParticipants: true,
  _count: { select: { responses: true } },
} satisfies Prisma.PollSelect;

/**
 * One page of the polls matching `scope`, newest first, plus the per-filter
 * counts. `page` comes back clamped to the last page, so callers can fix a stale URL.
 * With `archive`, archived polls only show under their own filter; otherwise
 * archiving is invisible (invitees still see an archived poll, as closed).
 */
async function listPollPage<S extends Prisma.PollSelect>(
  scope: Prisma.PollWhereInput,
  select: S,
  { filter, q, page }: PollListParams,
  now: Date,
  { archive = false }: { archive?: boolean } = {},
) {
  const active: Prisma.PollWhereInput = archive ? { AND: [scope, { archivedAt: null }] } : scope;
  const archived: Prisma.PollWhereInput = { AND: [scope, { archivedAt: { not: null } }] };
  const filtered = filter === "archived" ? (archive ? archived : scope) : { AND: [active, statusWhere(filter, now)] };
  const where: Prisma.PollWhereInput = {
    AND: [filtered, q ? { title: { contains: q, mode: "insensitive" } } : {}],
  };
  const [all, open, archivedCount, total] = await Promise.all([
    db.poll.count({ where: active }),
    db.poll.count({ where: { AND: [active, statusWhere("open", now)] } }),
    archive ? db.poll.count({ where: archived }) : 0,
    db.poll.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / POLLS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const polls = await db.poll.findMany({
    where,
    // The id tiebreak keeps pages stable when polls share a timestamp.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * POLLS_PER_PAGE,
    take: POLLS_PER_PAGE,
    select,
  });

  return {
    polls,
    total,
    page: currentPage,
    pageCount,
    counts: { all, open, closed: all - open, archived: archivedCount } satisfies Record<PollFilter, number>,
  };
}

/** One page of an owner's polls. */
export async function listPollsForOwner(creatorId: string, params: PollListParams, now: Date = new Date()) {
  return listPollPage({ creatorId }, pollListSelect, params, now, { archive: true });
}

/**
 * One page of other people's polls this user was invited to, directly or
 * through a group. Includes whether they've voted yet.
 */
export async function listPollsSharedWith(
  user: { id: string; email: string },
  params: PollListParams,
  now: Date = new Date(),
) {
  const scope: Prisma.PollWhereInput = {
    creatorId: { not: user.id },
    OR: [
      { invites: { some: { email: user.email } } },
      { groups: { some: { group: { members: { some: { email: user.email } } } } } },
    ],
  };
  return listPollPage(
    scope,
    {
      ...pollListSelect,
      creator: { select: { name: true } },
      responses: { where: { userId: user.id }, select: { id: true }, take: 1 },
    },
    params,
    now,
  );
}

/**
 * Polls this user has voted on and can still reach. A private poll drops off
 * the list once the invite (or the group carrying it) is gone, matching what
 * canAccessPoll would say if they opened it again.
 */
function votedScope(user: { id: string; email: string }): Prisma.PollWhereInput {
  return {
    responses: { some: { userId: user.id } },
    OR: [
      { visibility: "PUBLIC" },
      { creatorId: user.id },
      { invites: { some: { email: user.email } } },
      { groups: { some: { group: { members: { some: { email: user.email } } } } } },
    ],
  };
}

/** Adds the poll's own vote, plus everything summarizeAnswers and canViewResults need. */
const votedPollSelect = (userId: string) =>
  ({
    ...pollListSelect,
    creatorId: true,
    config: true,
    allowVoteChange: true,
    isAnonymous: true,
    requireLogin: true,
    resultsVisibility: true,
    creator: { select: { name: true } },
    options: {
      select: { id: true, label: true, position: true, startsAt: true, endsAt: true, createdAt: true },
      orderBy: { position: "asc" },
    },
    responses: {
      where: { userId },
      select: { createdAt: true, updatedAt: true, answers: { select: { optionId: true, value: true } } },
      take: 1,
    },
  }) satisfies Prisma.PollSelect;

/**
 * One page of the polls this user has voted on, including their own. Archiving
 * is the owner's own filing, so archived polls simply list under their status.
 */
export async function listPollsVotedOn(
  user: { id: string; email: string },
  params: PollListParams,
  now: Date = new Date(),
) {
  return listPollPage(votedScope(user), votedPollSelect(user.id), params, now);
}

/** Totals for the dashboard's scope switcher; each page only needs the one it isn't listing. */
export const countOwnedPolls = (creatorId: string) =>
  db.poll.count({ where: { creatorId, archivedAt: null } });

export const countVotedPolls = (user: { id: string; email: string }) =>
  db.poll.count({ where: votedScope(user) });

/** Closes an open poll now. The owner check happens in the caller (requireOwner). */
export async function closePoll(pollId: string, now: Date = new Date()) {
  const poll = await db.poll.findUniqueOrThrow({ where: { id: pollId } });
  if (!isPollOpen(poll, now)) throw new AppError(ErrorCode.ALREADY_CLOSED);
  // Conditional update so two concurrent closes can't both "succeed".
  const { count } = await db.poll.updateMany({ where: { id: pollId, closedAt: null }, data: { closedAt: now } });
  if (count === 0) throw new AppError(ErrorCode.ALREADY_CLOSED);
  return poll;
}

const reopenSchema = z.object({ closesAt: pollSettingsSchema.shape.closesAt.optional() });

/**
 * Reopens a closed poll. `closesAt` sets a new deadline (null removes it);
 * leaving it out keeps the current deadline, which must still be ahead.
 */
export async function reopenPoll(pollId: string, input: unknown = {}, now: Date = new Date()) {
  const parsed = reopenSchema.safeParse(input);
  if (!parsed.success) throw validationError(parsed.error);
  const { closesAt } = parsed.data;

  const poll = await db.poll.findUniqueOrThrow({ where: { id: pollId } });
  if (poll.archivedAt) throw new AppError(ErrorCode.CONFLICT, ARCHIVED_MESSAGE);
  if (isPollOpen(poll, now)) throw new AppError(ErrorCode.CONFLICT, "This poll is already open.");
  if (closesAt === undefined && deadlinePassed(poll, now)) {
    throw new AppError(ErrorCode.CONFLICT, "The deadline has passed. Set a new deadline to reopen this poll.");
  }
  // Conditional update, like closePoll, so a concurrent close or reopen isn't silently overwritten.
  const { count } = await db.poll.updateMany({
    where: { id: pollId, closedAt: poll.closedAt, closesAt: poll.closesAt },
    // A fresh round of voting earns a fresh reminder and, on the next close, fresh results.
    data: { closedAt: null, autoRemindedAt: null, resultsEmailedAt: null, ...(closesAt !== undefined && { closesAt }) },
  });
  if (count === 0) throw new AppError(ErrorCode.CONFLICT, "This poll just changed. Reload and try again.");
  return poll;
}

/**
 * Applies an edit from the owner. Closed polls are read-only: the results are
 * final, so the owner has to reopen the poll first. Once people have voted, the type, the type's
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
  if (!isPollOpen(existing, now)) throw new AppError(ErrorCode.POLL_CLOSED, CLOSED_EDIT_MESSAGE);
  const hasVotes = existing._count.responses > 0;
  const raw = (typeof input === "object" && input !== null ? input : {}) as Partial<PollSubmission>;

  const parsed = parsePollSubmission({ ...raw, type: existing.type, template: existing.template });
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, undefined, { fieldErrors: parsed.fieldErrors });
  const { title, description, config, options, settings } = parsed.data;

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
    // Only while still open: the poll may have closed since it was loaded.
    const { count } = await tx.poll.updateMany({
      where: { id: pollId, ...statusWhere("open", now) },
      data: {
        title,
        description: description ?? null,
        ...(!hasVotes && { config }),
        ...settings,
        // A moved deadline gets its own reminder.
        ...(settings.closesAt?.getTime() !== existing.closesAt?.getTime() && { autoRemindedAt: null }),
      },
    });
    if (count === 0) throw new AppError(ErrorCode.POLL_CLOSED, CLOSED_EDIT_MESSAGE);

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

  return { id: existing.id, slug: existing.slug };
}

export async function deletePoll(pollId: string) {
  await db.poll.delete({ where: { id: pollId } });
}

/** Most polls one bulk action touches: a page of the dashboard is 10, "select all" can't exceed this. */
export const MAX_BULK_POLLS = 100;

/** Poll ids from the client, limited to the owner's own polls by every query below. */
export function parsePollIds(input: unknown): string[] {
  const parsed = z.array(z.uuid()).min(1).max(MAX_BULK_POLLS).safeParse(input);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, "Select between 1 and 100 polls.");
  return [...new Set(parsed.data)];
}

/**
 * Closes the owner's selected polls that are still open, and returns their ids
 * (so the caller can send results). Archived and already-closed polls are skipped.
 */
export async function closePolls(creatorId: string, ids: string[], now: Date = new Date()) {
  const where: Prisma.PollWhereInput = { id: { in: ids }, creatorId, archivedAt: null, ...statusWhere("open", now) };
  const open = await db.poll.findMany({ where, select: { id: true } });
  await db.poll.updateMany({ where: { ...where, id: { in: open.map((poll) => poll.id) } }, data: { closedAt: now } });
  return open.map((poll) => poll.id);
}

/**
 * Archives the owner's selected polls: open ones close now (without a results
 * email: archiving means putting it away), and all of them leave the main lists.
 * Returns how many were archived.
 */
export async function archivePolls(creatorId: string, ids: string[], now: Date = new Date()) {
  const scope: Prisma.PollWhereInput = { id: { in: ids }, creatorId, archivedAt: null };
  const [, archived] = await db.$transaction([
    db.poll.updateMany({ where: { ...scope, ...statusWhere("open", now) }, data: { closedAt: now, resultsEmailedAt: now } }),
    db.poll.updateMany({ where: scope, data: { archivedAt: now } }),
  ]);
  return archived.count;
}

/** Puts archived polls back on the main lists. They stay closed; reopen them separately. */
export async function unarchivePolls(creatorId: string, ids: string[]) {
  const { count } = await db.poll.updateMany({
    where: { id: { in: ids }, creatorId, archivedAt: { not: null } },
    data: { archivedAt: null },
  });
  return count;
}

export async function deletePolls(creatorId: string, ids: string[]) {
  const { count } = await db.poll.deleteMany({ where: { id: { in: ids }, creatorId } });
  return count;
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
