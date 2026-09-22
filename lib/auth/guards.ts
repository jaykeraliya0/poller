import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";

export type CurrentUser = { id: string; name: string; email: string; emailVerified: boolean };

/**
 * The signed-in user, or null. Checks the database as well as the JWT, so a
 * session for a deleted account, or one from before a password reset, stops
 * working immediately. Cached per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, emailVerifiedAt: true, passwordChangedAt: true },
  });
  if (!user) return null;
  if (user.passwordChangedAt && (session.authAt ?? 0) < user.passwordChangedAt.getTime()) return null;
  return { id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerifiedAt !== null };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError(ErrorCode.UNAUTHENTICATED);
  return user;
}

export const UNVERIFIED_CREATE_MESSAGE = "Confirm your email address to create polls.";

/** Creating polls needs a confirmed email, so throwaway addresses can't be used to churn out polls. */
export async function requireVerifiedUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.emailVerified) throw new AppError(ErrorCode.EMAIL_UNVERIFIED, UNVERIFIED_CREATE_MESSAGE);
  return user;
}

/** For pages: sends signed-out visitors to login, then back to `path`. */
export async function requirePageUser(path: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  return user;
}

const pollIdSchema = z.uuid();

/**
 * Loads a poll the current user owns. Missing polls and other people's polls
 * both return NOT_FOUND, so poll ids can't be probed.
 */
export async function requireOwner(pollId: string) {
  const user = await requireUser();
  if (!pollIdSchema.safeParse(pollId).success) throw new AppError(ErrorCode.NOT_FOUND);

  const poll = await db.poll.findFirst({ where: { id: pollId, creatorId: user.id } });
  if (!poll) throw new AppError(ErrorCode.NOT_FOUND);
  return { user, poll };
}

/** For owner-only pages: login redirect if signed out, 404 if not their poll. */
export async function requirePageOwner(pollId: string, path: string) {
  const user = await requirePageUser(path);
  if (!pollIdSchema.safeParse(pollId).success) notFound();
  const poll = await db.poll.findFirst({ where: { id: pollId, creatorId: user.id } });
  if (!poll) notFound();
  return { user, poll };
}

const groupIdSchema = z.uuid();

/** Loads a group the current user owns. Other people's groups don't exist, as far as they can tell. */
export async function requireGroupOwner(groupId: string) {
  const user = await requireUser();
  if (!groupIdSchema.safeParse(groupId).success) throw new AppError(ErrorCode.NOT_FOUND, "We couldn't find that group.");
  const group = await db.group.findFirst({ where: { id: groupId, ownerId: user.id } });
  if (!group) throw new AppError(ErrorCode.NOT_FOUND, "We couldn't find that group.");
  return { user, group };
}

/** For group pages: login redirect if signed out, 404 if not their group. */
export async function requirePageGroupOwner(groupId: string, path: string) {
  const user = await requirePageUser(path);
  if (!groupIdSchema.safeParse(groupId).success) notFound();
  const group = await db.group.findFirst({ where: { id: groupId, ownerId: user.id } });
  if (!group) notFound();
  return { user, group };
}
