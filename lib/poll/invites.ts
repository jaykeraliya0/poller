import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { EMAIL_LIST_LIMITS, parseEmailList } from "@/lib/validation/emails";

const idSchema = z.uuid();

/**
 * Invites a pasted list of emails. Already-invited addresses and the owner's
 * own are skipped. Returns the newly invited addresses.
 */
export async function addInvites(poll: { id: string; creatorId: string }, rawEmails: unknown) {
  const parsed = parseEmailList(rawEmails);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, undefined, { fieldErrors: { emails: [parsed.error] } });

  const owner = await db.user.findUniqueOrThrow({ where: { id: poll.creatorId }, select: { email: true } });
  const emails = parsed.emails.filter((email) => email !== owner.email.toLowerCase());

  return db.$transaction(async (tx) => {
    const existing = await tx.pollInvite.findMany({ where: { pollId: poll.id }, select: { email: true } });
    const known = new Set(existing.map((invite) => invite.email.toLowerCase()));
    const fresh = emails.filter((email) => !known.has(email));
    if (existing.length + fresh.length > EMAIL_LIST_LIMITS.invitesPerPoll) {
      throw new AppError(ErrorCode.VALIDATION, undefined, {
        fieldErrors: { emails: [`A poll can have up to ${EMAIL_LIST_LIMITS.invitesPerPoll} direct invites. Use a group for more.`] },
      });
    }
    const created = await tx.pollInvite.createManyAndReturn({
      data: fresh.map((email) => ({ pollId: poll.id, email })),
      skipDuplicates: true,
      select: { email: true },
    });
    return { added: created.length, emails: created.map((invite) => invite.email) };
  });
}

export async function removeInvite(pollId: string, inviteId: unknown) {
  if (!idSchema.safeParse(inviteId).success) throw new AppError(ErrorCode.NOT_FOUND, "That invite no longer exists.");
  const { count } = await db.pollInvite.deleteMany({ where: { id: inviteId as string, pollId } });
  if (count === 0) throw new AppError(ErrorCode.NOT_FOUND, "That invite no longer exists.");
}

/**
 * Replaces the groups shared with a poll. Every group must belong to the
 * poll's creator. Returns the ids of groups that weren't linked before.
 */
export async function setPollGroups(poll: { id: string; creatorId: string }, groupIds: unknown) {
  const ids = z.array(z.uuid()).max(100).safeParse(groupIds);
  if (!ids.success) throw new AppError(ErrorCode.NOT_FOUND, "Some of those groups no longer exist.");
  const unique = [...new Set(ids.data)];

  const owned = await db.group.count({ where: { id: { in: unique }, ownerId: poll.creatorId } });
  if (owned !== unique.length) throw new AppError(ErrorCode.NOT_FOUND, "Some of those groups no longer exist.");

  const [, linked] = await db.$transaction([
    db.pollGroup.deleteMany({ where: { pollId: poll.id, groupId: { notIn: unique } } }),
    db.pollGroup.createManyAndReturn({
      data: unique.map((groupId) => ({ pollId: poll.id, groupId })),
      skipDuplicates: true,
      select: { groupId: true },
    }),
  ]);
  return { linked: linked.map((link) => link.groupId) };
}

export type PollAccess = Awaited<ReturnType<typeof listPollAccess>>;

/** Everything the owner's access panel shows: direct invites, and their groups with which are linked. */
export async function listPollAccess(poll: { id: string; creatorId: string }) {
  const [invites, groups] = await Promise.all([
    db.pollInvite.findMany({ where: { pollId: poll.id }, orderBy: { createdAt: "asc" } }),
    db.group.findMany({
      where: { ownerId: poll.creatorId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: { select: { members: true } },
        polls: { where: { pollId: poll.id }, select: { pollId: true } },
      },
    }),
  ]);

  // citext compares case-insensitively, so this matches however the invite was typed.
  const joined = await db.user.findMany({
    where: { email: { in: invites.map((invite) => invite.email) } },
    select: { email: true },
  });
  const joinedEmails = new Set(joined.map((user) => user.email.toLowerCase()));

  return {
    invites: invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      hasAccount: joinedEmails.has(invite.email.toLowerCase()),
    })),
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      memberCount: group._count.members,
      linked: group.polls.length > 0,
    })),
  };
}
