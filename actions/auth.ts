"use server";

import { AuthError } from "next-auth";
import { redirect, unstable_rethrow } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { requestPasswordReset, resetPassword, sendVerificationEmail } from "@/lib/auth/account-emails";
import { registerUser } from "@/lib/auth/users";
import { deferEmail } from "@/lib/email/defer";
import { ErrorCode, fail, toActionFailure, toFieldErrors } from "@/lib/errors";
import { formValues, type FormState } from "@/lib/forms";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { forgotPasswordSchema, loginSchema } from "@/lib/validation/auth";

type LoginValues = { email: string };
type RegisterValues = { name: string; email: string };

const INVALID_CREDENTIALS = "Incorrect email or password.";

/** Signs in with credentials; returns false instead of throwing on bad credentials. */
async function signInWithPassword(email: string, password: string): Promise<boolean> {
  try {
    const url = await signIn("credentials", { email, password, redirect: false });
    return !new URL(url, "http://localhost").searchParams.has("error");
  } catch (error) {
    if (error instanceof AuthError) return false;
    throw error;
  }
}

export async function loginAction(
  _previous: FormState<LoginValues>,
  formData: FormData,
): Promise<FormState<LoginValues>> {
  const values = formValues(formData, ["email"]);
  const next = safeRedirectPath(formData.get("next"));

  try {
    await enforceRateLimit("login", await getClientIp());

    const parsed = loginSchema.safeParse({ email: values.email, password: formData.get("password") });
    if (!parsed.success) {
      return { ...fail(ErrorCode.VALIDATION, undefined, { fieldErrors: toFieldErrors(parsed.error) }), values };
    }

    if (!(await signInWithPassword(parsed.data.email, parsed.data.password))) {
      return { ...fail(ErrorCode.VALIDATION, INVALID_CREDENTIALS), values };
    }
  } catch (error) {
    return { ...toActionFailure(error), values };
  }

  redirect(next);
}

export async function registerAction(
  _previous: FormState<RegisterValues>,
  formData: FormData,
): Promise<FormState<RegisterValues>> {
  const values = formValues(formData, ["name", "email"]);
  const next = safeRedirectPath(formData.get("next"));
  const password = formData.get("password");

  try {
    await enforceRateLimit("register", await getClientIp());
    const user = await registerUser({ ...values, password });
    deferEmail("verification", () => sendVerificationEmail(user.id));

    if (!(await signInWithPassword(user.email, String(password)))) {
      // Account exists but auto sign-in failed; let them sign in manually.
      redirect(`/login?next=${encodeURIComponent(next)}`);
    }
  } catch (error) {
    unstable_rethrow(error);
    return { ...toActionFailure(error), values };
  }

  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

type ForgotValues = { email: string };
export type ForgotPasswordState = FormState<ForgotValues> | { ok: true; email: string };

/**
 * Emails a reset link. Always answers the same way whether or not an account
 * exists, and sends after responding, so neither the message nor the timing
 * gives away who has an account.
 */
export async function forgotPasswordAction(
  _previous: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const values = formValues(formData, ["email"]);
  try {
    await enforceRateLimit("reset-ip", await getClientIp());
    const parsed = forgotPasswordSchema.safeParse(values);
    if (!parsed.success) {
      return { ...fail(ErrorCode.VALIDATION, undefined, { fieldErrors: toFieldErrors(parsed.error) }), values };
    }
    await enforceRateLimit("reset-email", parsed.data.email);
    deferEmail("password reset", () => requestPasswordReset(parsed.data.email));
    return { ok: true, email: parsed.data.email };
  } catch (error) {
    return { ...toActionFailure(error), values };
  }
}

/** Sets the new password, then sends them to sign in with it (every old session is now signed out). */
export async function resetPasswordAction(_previous: FormState<never>, formData: FormData): Promise<FormState<never>> {
  try {
    await enforceRateLimit("reset-submit", await getClientIp());
    await resetPassword({ token: formData.get("token"), password: formData.get("password") });
  } catch (error) {
    return toActionFailure(error);
  }
  // The current browser's session is one of the old ones.
  await signOut({ redirect: false });
  redirect("/login?reset=1");
}
