"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireOwner, requireUser } from "@/lib/auth/guards";
import { ok, toActionFailure, type ActionFailure, type ActionResult } from "@/lib/errors";
import { closePoll, createPoll, reopenPoll } from "@/lib/poll/service";
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

function revalidatePollPages(pollId: string, slug: string) {
  revalidatePath(`/polls/${pollId}/manage`);
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/results`);
  revalidatePath("/dashboard");
}

export async function closePollAction(pollId: string): Promise<ActionResult> {
  try {
    const { poll } = await requireOwner(pollId);
    await closePoll(poll.id);
    revalidatePollPages(poll.id, poll.slug);
    return ok();
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function reopenPollAction(pollId: string): Promise<ActionResult> {
  try {
    const { poll } = await requireOwner(pollId);
    await reopenPoll(poll.id);
    revalidatePollPages(poll.id, poll.slug);
    return ok();
  } catch (error) {
    return toActionFailure(error);
  }
}
