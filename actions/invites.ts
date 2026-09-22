"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/guards";
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
    const result = await addInvites(poll, emails);
    revalidateAccess(poll.id, poll.slug);
    return ok(result);
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
    await setPollGroups(poll, groupIds);
    revalidateAccess(poll.id, poll.slug);
    revalidatePath("/groups/[id]", "page");
    return ok();
  } catch (error) {
    return toActionFailure(error);
  }
}
