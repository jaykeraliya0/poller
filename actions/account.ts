"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { signOut } from "@/auth";
import { sendVerificationEmail } from "@/lib/auth/account-emails";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { ok, toActionFailure, type ActionResult } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { FormState } from "@/lib/forms";
import { deleteAccount } from "@/lib/poll/service";

export async function deleteAccountAction(
  _previous: FormState<{ confirmation: string }>,
  formData: FormData,
): Promise<FormState<{ confirmation: string }>> {
  const confirmation = String(formData.get("confirmation") ?? "");
  try {
    const user = await requireUser();
    await deleteAccount(user, confirmation);
    await signOut({ redirectTo: "/?account=deleted" });
  } catch (error) {
    unstable_rethrow(error);
    return { ...toActionFailure(error), values: { confirmation } };
  }
  return null;
}

/** Sends a fresh confirmation link to the signed-in user's address. */
export async function resendVerificationAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.emailVerified) return ok();
    await enforceRateLimit("verify-email", user.id);
    await sendVerificationEmail(user.id);
    return ok();
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function setEmailNotificationsAction(enabled: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await db.user.update({ where: { id: user.id }, data: { emailNotifications: enabled === true } });
    revalidatePath("/settings");
    return ok();
  } catch (error) {
    return toActionFailure(error);
  }
}
