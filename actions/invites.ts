"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/guards";
import { deferEmail } from "@/lib/email/defer";
import { claimManualReminder, notifyInvitees, notifyLinkedGroupMembers, sendClaimedReminders } from "@/lib/email/poll-emails";
import { ok, toActionFailure, type ActionResult } from "@/lib/errors";
import { addInvites, removeInvite, setPollGroups } from "@/lib/poll/invites";
import { enforceRateLimit } from "@/lib/rate-limit";

function revalidateAccess(pollId: string, slug: string) {
  revalidatePath(`/polls/${pollId}/manage`);
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/results`);
  revalidatePath("/shared");
}

export async function addInvitesAction(pollId: string, emails: string): Promise<ActionResult<{ added: number }>> {
  try {
    const { user, poll } = await requireOwner(pollId);
    await enforceRateLimit("invite", user.id);
    const { added, emails: invited } = await addInvites(poll, emails);
    deferEmail("invite", () => notifyInvitees(poll.id, invited));
    revalidateAccess(poll.id, poll.slug);
    return ok({ added });
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function removeInviteAction(pollId: string, inviteId: string): Promise<ActionResult> {
  try {
    const { poll } = await requireOwner(pollId);
    await removeInvite(poll.id, inviteId);
    revalidateAccess(poll.id, poll.slug);
    return ok();
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function setPollGroupsAction(pollId: string, groupIds: string[]): Promise<ActionResult> {
  try {
    const { poll } = await requireOwner(pollId);
    const { linked } = await setPollGroups(poll, groupIds);
    deferEmail("group invite", () => notifyLinkedGroupMembers(poll.id, linked));
    revalidateAccess(poll.id, poll.slug);
    revalidatePath("/groups/[id]", "page");
    return ok();
  } catch (error) {
    return toActionFailure(error);
  }
}

/** Emails everyone invited who hasn't voted yet. Limited to one reminder per 12 hours. */
export async function sendRemindersAction(pollId: string): Promise<ActionResult<{ pending: number }>> {
  try {
    const { poll } = await requireOwner(pollId);
    const result = await claimManualReminder(poll);
    deferEmail("reminder", () => sendClaimedReminders(poll.id));
    revalidatePath(`/polls/${poll.id}/manage`);
    return ok(result);
  } catch (error) {
    return toActionFailure(error);
  }
}
