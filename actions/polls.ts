"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { toActionFailure, type ActionFailure } from "@/lib/errors";
import { createPoll } from "@/lib/poll/service";
import { enforceRateLimit } from "@/lib/rate-limit";

/** Creates a poll and redirects to its manage page; returns only on failure. */
export async function createPollAction(input: unknown): Promise<ActionFailure> {
  let pollId: string;
  try {
    const user = await requireUser();
    await enforceRateLimit("create", user.id);
    ({ id: pollId } = await createPoll(user.id, input));
  } catch (error) {
    unstable_rethrow(error);
    return toActionFailure(error);
  }

  revalidatePath("/dashboard");
  redirect(`/polls/${pollId}/manage?created=1`);
}
