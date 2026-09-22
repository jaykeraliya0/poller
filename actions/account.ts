"use server";

import { unstable_rethrow } from "next/navigation";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/auth/guards";
import { toActionFailure } from "@/lib/errors";
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
