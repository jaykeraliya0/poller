import "server-only";
import type { Poll } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { Viewer } from "./permissions";
import type { VoterIdentity } from "./votes";

/** Whether `email` was invited to the poll directly or belongs to a group shared with it. */
export async function isInvited(pollId: string, email: string): Promise<boolean> {
  const count = await db.poll.count({
    where: {
      id: pollId,
      OR: [{ invites: { some: { email } } }, { groups: { some: { group: { members: { some: { email } } } } } }],
    },
  });
  return count > 0;
}

/** The permission viewer for this identity. Only private polls pay for the invite lookup. */
export async function buildViewer(
  poll: Pick<Poll, "id" | "creatorId" | "visibility">,
  identity: Pick<VoterIdentity, "userId" | "userEmail">,
  hasVoted: boolean,
): Promise<Viewer> {
  const isOwner = identity.userId !== null && poll.creatorId === identity.userId;
  const needsLookup = poll.visibility === "PRIVATE" && !isOwner && identity.userEmail !== null;
  return {
    userId: identity.userId,
    isOwner,
    hasVoted,
    isInvited: needsLookup ? await isInvited(poll.id, identity.userEmail!) : false,
  };
}
