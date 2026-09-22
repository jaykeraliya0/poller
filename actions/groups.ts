"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireGroupOwner, requireUser } from "@/lib/auth/guards";
import { ok, toActionFailure, type ActionFailure, type ActionResult } from "@/lib/errors";
import { formValues, type FormState } from "@/lib/forms";
import { deferEmail } from "@/lib/email/defer";
import { notifyNewGroupMembers } from "@/lib/email/poll-emails";
import { addMembers, createGroup, deleteGroup, removeMember, renameGroup } from "@/lib/groups/service";
import { enforceRateLimit } from "@/lib/rate-limit";

/** Membership is live, so a change can open or close polls for people. */
function revalidateGroup(groupId: string) {
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/shared");
  revalidatePath("/polls/[id]/manage", "page");
  revalidatePath("/p/[slug]", "page");
  revalidatePath("/p/[slug]/results", "page");
}

type GroupValues = { name: string; emails: string };

/** Creates a group and opens it; returns only on failure. */
export async function createGroupAction(_previous: FormState<GroupValues>, formData: FormData): Promise<FormState<GroupValues>> {
  const values = formValues(formData, ["name", "emails"] as const);
  let groupId: string;
  try {
    const user = await requireUser();
    await enforceRateLimit("invite", user.id);
    ({ id: groupId } = await createGroup(user.id, values));
  } catch (error) {
    unstable_rethrow(error);
    return { ...toActionFailure(error), values };
  }
  revalidatePath("/groups");
  redirect(`/groups/${groupId}?created=1`);
}

export async function renameGroupAction(groupId: string, name: string): Promise<ActionResult> {
  try {
    const { group } = await requireGroupOwner(groupId);
    await renameGroup(group.id, name);
    revalidateGroup(group.id);
    return ok();
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function addMembersAction(groupId: string, emails: string): Promise<ActionResult<{ added: number }>> {
  try {
    const { user, group } = await requireGroupOwner(groupId);
    await enforceRateLimit("invite", user.id);
    const { added, emails: members } = await addMembers(group.id, emails);
    deferEmail("group member invite", () => notifyNewGroupMembers(group.id, members));
    revalidateGroup(group.id);
    return ok({ added });
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function removeMemberAction(groupId: string, email: string): Promise<ActionResult> {
  try {
    const { group } = await requireGroupOwner(groupId);
    await removeMember(group.id, email);
    revalidateGroup(group.id);
    return ok();
  } catch (error) {
    return toActionFailure(error);
  }
}

/** Deletes the group and goes back to the list; returns only on failure. */
export async function deleteGroupAction(groupId: string): Promise<ActionFailure> {
  try {
    const { group } = await requireGroupOwner(groupId);
    await deleteGroup(group.id);
    revalidateGroup(group.id);
  } catch (error) {
    unstable_rethrow(error);
    return toActionFailure(error);
  }
  redirect("/groups?deleted=1");
}
