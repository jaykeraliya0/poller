import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { EmailTokenPurpose } from "@/generated/prisma/client";
import { db } from "@/lib/db";

const HOUR = 60 * 60 * 1000;

export const TOKEN_LIFETIME_MS: Record<EmailTokenPurpose, number> = {
  VERIFY_EMAIL: 48 * HOUR,
  RESET_PASSWORD: HOUR,
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Issues a single-use token for a link in an email. Only its hash is stored,
 * and older unused tokens for the same purpose stop working, so only the
 * newest email's link is live.
 */
export async function issueEmailToken(userId: string, purpose: EmailTokenPurpose, now: Date = new Date()) {
  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.emailToken.deleteMany({ where: { userId, purpose, usedAt: null } }),
    db.emailToken.create({
      data: { userId, purpose, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + TOKEN_LIFETIME_MS[purpose]) },
    }),
  ]);
  return token;
}

/** Tokens arrive from URLs and forms; anything that isn't shaped like one is rejected before hashing. */
const isTokenShaped = (token: unknown): token is string => typeof token === "string" && /^[\w-]{43}$/.test(token);

/** The user a live token belongs to, without using it up (e.g. to decide whether to show the reset form). */
export async function peekEmailToken(token: unknown, purpose: EmailTokenPurpose, now: Date = new Date()) {
  if (!isTokenShaped(token)) return null;
  const row = await db.emailToken.findUnique({ where: { tokenHash: hashToken(token) }, select: { userId: true, purpose: true, usedAt: true, expiresAt: true } });
  if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt <= now) return null;
  return { userId: row.userId };
}

/**
 * Uses up a live token and returns its user id, or null if it's unknown,
 * expired or already used. The conditional update makes it single-use even
 * when the same link is opened twice at once.
 */
export async function consumeEmailToken(token: unknown, purpose: EmailTokenPurpose, now: Date = new Date()) {
  const live = await peekEmailToken(token, purpose, now);
  if (!live) return null;
  const { count } = await db.emailToken.updateMany({
    where: { tokenHash: hashToken(token as string), usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  return count === 1 ? live : null;
}
