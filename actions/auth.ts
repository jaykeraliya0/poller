"use server";

import { AuthError } from "next-auth";
import { redirect, unstable_rethrow } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { registerUser } from "@/lib/auth/users";
import { ErrorCode, fail, toActionFailure, toFieldErrors } from "@/lib/errors";
import { formValues, type FormState } from "@/lib/forms";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { loginSchema } from "@/lib/validation/auth";

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
