"use server";

import { revalidatePath } from "next/cache";
import { ok, toActionFailure, type ActionResult } from "@/lib/errors";
import { ensureVoterIdentity, setVoterToken } from "@/lib/poll/viewer";
import { castVote, withdrawVote } from "@/lib/poll/votes";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

function revalidatePoll(slug: string, pollId: string) {
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/results`);
  revalidatePath(`/polls/${pollId}/manage`);
  revalidatePath("/dashboard");
}

const slugOf = (input: unknown) =>
  typeof input === "object" && input !== null && typeof (input as { slug?: unknown }).slug === "string"
    ? (input as { slug: string }).slug
    : "";

export async function submitVoteAction(input: unknown): Promise<ActionResult<{ updated: boolean }>> {
  try {
    const ip = await getClientIp();
    await enforceRateLimit("vote", ip);
    await enforceRateLimit("vote-poll", `${slugOf(input)}:${ip}`);

    const identity = await ensureVoterIdentity();
    const result = await castVote(input, identity);
    if (result.voterToken !== identity.voterToken) await setVoterToken(result.voterToken);

    revalidatePoll(result.slug, result.pollId);
    return ok({ updated: result.updated });
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function withdrawVoteAction(slug: string): Promise<ActionResult> {
  try {
    const identity = await ensureVoterIdentity();
    const result = await withdrawVote(slug, identity);
    revalidatePoll(result.slug, result.pollId);
    return ok();
  } catch (error) {
    return toActionFailure(error);
  }
}
