import "server-only";
import { db } from "@/lib/db";
import { passwordResetTemplate, verifyEmailTemplate } from "@/lib/email/templates";
import { sendEmails } from "@/lib/email/transport";
import { AppError, ErrorCode, validationError } from "@/lib/errors";
import { appUrl } from "@/lib/urls";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { consumeEmailToken, issueEmailToken } from "./email-tokens";
import { hashPassword } from "./password";

/** Emails a fresh confirmation link. A no-op for addresses that are already confirmed. */
export async function sendVerificationEmail(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, emailVerifiedAt: true } });
  if (!user || user.emailVerifiedAt) return;
  const token = await issueEmailToken(userId, "VERIFY_EMAIL");
  await sendEmails([
    { to: user.email, ...verifyEmailTemplate({ name: user.name, url: appUrl(`/verify-email?token=${token}`) }) },
  ]);
}

/** Confirms the address a verification link was sent to. Returns the user id, or null for a dead link. */
export async function verifyEmail(token: unknown, now: Date = new Date()) {
  const used = await consumeEmailToken(token, "VERIFY_EMAIL", now);
  if (!used) return null;
  await db.user.updateMany({ where: { id: used.userId, emailVerifiedAt: null }, data: { emailVerifiedAt: now } });
  return used.userId;
}

/**
 * Emails a reset link if an account uses this address. Says nothing either
 * way, so the form can't be used to find out who has an account.
 */
export async function requestPasswordReset(email: string) {
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!user) return;
  const token = await issueEmailToken(user.id, "RESET_PASSWORD");
  await sendEmails([
    { to: user.email, ...passwordResetTemplate({ name: user.name, url: appUrl(`/reset-password?token=${token}`) }) },
  ]);
}

export const INVALID_RESET_LINK = "This reset link has expired or was already used. Ask for a new one.";

/**
 * Sets a new password from a reset link. Opening the link proves the user
 * reads this inbox, so it confirms the address too. Every existing session
 * stops working (see getCurrentUser).
 */
export async function resetPassword(input: { token: unknown; password: unknown }, now: Date = new Date()) {
  const parsed = resetPasswordSchema.safeParse({ password: input.password });
  if (!parsed.success) throw validationError(parsed.error);

  const used = await consumeEmailToken(input.token, "RESET_PASSWORD", now);
  if (!used) throw new AppError(ErrorCode.VALIDATION, INVALID_RESET_LINK);

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await db.user.findUniqueOrThrow({ where: { id: used.userId }, select: { emailVerifiedAt: true } });
  await db.$transaction([
    db.user.update({
      where: { id: used.userId },
      data: { passwordHash, passwordChangedAt: now, emailVerifiedAt: user.emailVerifiedAt ?? now },
    }),
    db.emailToken.deleteMany({ where: { userId: used.userId, purpose: "RESET_PASSWORD", usedAt: null } }),
  ]);
  return used.userId;
}
