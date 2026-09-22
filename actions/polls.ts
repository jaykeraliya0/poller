"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireOwner, requireUser, requireVerifiedUser } from "@/lib/auth/guards";
import { deferEmail } from "@/lib/email/defer";
import { sendResultsEmail } from "@/lib/email/poll-emails";
import { AppError, ErrorCode, ok, toActionFailure, type ActionFailure, type ActionResult } from "@/lib/errors";
import {
  archivePolls,
  closePoll,
  closePolls,
  createPoll,
  deletePoll,
  deletePolls,
  parsePollIds,
  reopenPoll,
  unarchivePolls,
  updatePoll,
} from "@/lib/poll/service";
import { enforceRateLimit } from "@/lib/rate-limit";

/** Creates a poll and redirects to its manage page; returns only on failure. */
export async function createPollAction(input: unknown): Promise<ActionFailure> {
  let pollId: string;
  try {
    const user = await requireVerifiedUser();
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
    deferEmail("results", () => sendResultsEmail(poll.id));
    revalidatePollPages(poll.id, poll.slug);
    return ok();
  } catch (error) {
    return toActionFailure(error);
  }
}

/** `input.closesAt` sets a new deadline, which a poll whose deadline has passed needs. */
export async function reopenPollAction(pollId: string, input: unknown = {}): Promise<ActionResult> {
  try {
    const { poll } = await requireOwner(pollId);
    await reopenPoll(poll.id, input);
    revalidatePollPages(poll.id, poll.slug);
    return ok();
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function updatePollAction(pollId: string, input: unknown): Promise<ActionResult> {
  try {
    const { poll } = await requireOwner(pollId);
    await updatePoll(poll.id, input);
    revalidatePollPages(poll.id, poll.slug);
    return ok();
  } catch (error) {
    return toActionFailure(error);
  }
}

/** Deletes the poll with all its votes, then goes back to the dashboard; returns only on failure. */
export async function deletePollAction(pollId: string): Promise<ActionFailure> {
  try {
    const { poll } = await requireOwner(pollId);
    await deletePoll(poll.id);
    revalidatePollPages(poll.id, poll.slug);
  } catch (error) {
    unstable_rethrow(error);
    return toActionFailure(error);
  }
  redirect("/dashboard?deleted=1");
}

export async function archivePollAction(pollId: string): Promise<ActionResult> {
  try {
    const { user, poll } = await requireOwner(pollId);
    await archivePolls(user.id, [poll.id]);
    revalidatePollPages(poll.id, poll.slug);
    return ok();
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function unarchivePollAction(pollId: string): Promise<ActionResult> {
  try {
    const { user, poll } = await requireOwner(pollId);
    await unarchivePolls(user.id, [poll.id]);
    revalidatePollPages(poll.id, poll.slug);
    return ok();
  } catch (error) {
    return toActionFailure(error);
  }
}

export type BulkPollAction = "close" | "archive" | "unarchive" | "delete";

/**
 * One action on several of the owner's polls from the dashboard. Polls that
 * don't apply (already closed, someone else's, gone) are skipped, not errors;
 * `count` says how many actually changed.
 */
export async function bulkPollAction(action: BulkPollAction, pollIds: unknown): Promise<ActionResult<{ count: number }>> {
  try {
    const user = await requireUser();
    const ids = parsePollIds(pollIds);
    let count: number;
    switch (action) {
      case "close": {
        const closed = await closePolls(user.id, ids);
        for (const id of closed) deferEmail("results", () => sendResultsEmail(id));
        count = closed.length;
        break;
      }
      case "archive":
        count = await archivePolls(user.id, ids);
        break;
      case "unarchive":
        count = await unarchivePolls(user.id, ids);
        break;
      case "delete":
        count = await deletePolls(user.id, ids);
        break;
      default:
        throw new AppError(ErrorCode.VALIDATION, "Unknown action.");
    }
    // Slugs aren't known here; refresh the owner's pages and every poll page.
    revalidatePath("/dashboard");
    revalidatePath("/polls/[id]/manage", "page");
    revalidatePath("/p/[slug]", "page");
    revalidatePath("/p/[slug]/results", "page");
    return ok({ count });
  } catch (error) {
    return toActionFailure(error);
  }
}
