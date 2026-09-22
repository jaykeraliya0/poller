import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { EMAIL_LIST_LIMITS, parseEmailList } from "@/lib/validation/emails";
import { groupNameSchema } from "@/lib/validation/group";

const nameTaken = () =>
  new AppError(ErrorCode.VALIDATION, undefined, { fieldErrors: { name: ["You already have a group with that name"] } });

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

function parseName(input: unknown): string {
  const name = groupNameSchema.safeParse(input);
  if (!name.success) {
    throw new AppError(ErrorCode.VALIDATION, undefined, { fieldErrors: { name: name.error.issues.map((i) => i.message) } });
  }
  return name.data;
}

function parseMembers(input: unknown, max: number): string[] {
  const parsed = parseEmailList(input, max);
  if (!parsed.success) throw new AppError(ErrorCode.VALIDATION, undefined, { fieldErrors: { emails: [parsed.error] } });
  return parsed.emails;
}

export async function listGroups(ownerId: string) {
  return db.group.findMany({
    where: { ownerId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, name: true, createdAt: true, _count: { select: { members: true, polls: true } } },
  });
}

/** Creates a group, optionally with members. Emails are optional here, unlike when adding later. */
export async function createGroup(ownerId: string, input: { name: unknown; emails?: unknown }) {
  const name = parseName(input.name);
  const hasEmails = typeof input.emails === "string" && input.emails.trim() !== "";
  const emails = hasEmails ? parseMembers(input.emails, EMAIL_LIST_LIMITS.membersPerGroup) : [];
  try {
    return await db.group.create({
      data: { ownerId, name, members: { create: emails.map((email) => ({ email })) } },
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw nameTaken();
    throw error;
  }
}

export async function renameGroup(groupId: string, input: unknown) {
  const name = parseName(input);
  try {
    await db.group.update({ where: { id: groupId }, data: { name } });
  } catch (error) {
    if (isUniqueViolation(error)) throw nameTaken();
    throw error;
  }
}

/** Deleting a group unlinks it from every poll (cascade); direct invites stay. */
export async function deleteGroup(groupId: string) {
  await db.group.delete({ where: { id: groupId } });
}

export async function addMembers(groupId: string, input: unknown) {
  const emails = parseMembers(input, EMAIL_LIST_LIMITS.perSubmit);
  return db.$transaction(async (tx) => {
    const current = await tx.groupMember.findMany({ where: { groupId }, select: { email: true } });
    const known = new Set(current.map((member) => member.email.toLowerCase()));
    const fresh = emails.filter((email) => !known.has(email));
    if (current.length + fresh.length > EMAIL_LIST_LIMITS.membersPerGroup) {
      throw new AppError(ErrorCode.VALIDATION, undefined, {
        fieldErrors: { emails: [`A group can have up to ${EMAIL_LIST_LIMITS.membersPerGroup} members`] },
      });
    }
    const created = await tx.groupMember.createManyAndReturn({
      data: fresh.map((email) => ({ groupId, email })),
      skipDuplicates: true,
      select: { email: true },
    });
    // Touch the group so "recently changed" ordering and caches notice.
    await tx.group.update({ where: { id: groupId }, data: { updatedAt: new Date() } });
    return { added: created.length, emails: created.map((member) => member.email) };
  });
}

export async function removeMember(groupId: string, email: unknown) {
  if (typeof email !== "string" || email === "") throw new AppError(ErrorCode.NOT_FOUND, "That member is already gone.");
  const { count } = await db.groupMember.deleteMany({ where: { groupId, email } });
  if (count === 0) throw new AppError(ErrorCode.NOT_FOUND, "That member is already gone.");
}

/** A group's members (with whether they've signed up) and the polls it's shared with. */
export async function getGroupDetail(groupId: string) {
  const group = await db.group.findUniqueOrThrow({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      members: { orderBy: { email: "asc" }, select: { email: true } },
      polls: {
        orderBy: { createdAt: "desc" },
        select: { poll: { select: { id: true, title: true, visibility: true, closesAt: true, closedAt: true } } },
      },
    },
  });
  const joined = await db.user.findMany({
    where: { email: { in: group.members.map((member) => member.email) } },
    select: { email: true },
  });
  const joinedEmails = new Set(joined.map((user) => user.email.toLowerCase()));
  return {
    id: group.id,
    name: group.name,
    members: group.members.map((member) => ({
      email: member.email,
      hasAccount: joinedEmails.has(member.email.toLowerCase()),
    })),
    polls: group.polls.map((link) => link.poll),
  };
}
