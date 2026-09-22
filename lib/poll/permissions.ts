import type { Poll } from "@/generated/prisma/client";
import { ErrorCode } from "@/lib/errors";
import { isPollOpen } from "./status";

/**
 * Pure implementation of the permission matrix in the design doc. Every
 * server action and page checks these; the proxy is only a redirect layer.
 */

export type PollRules = Pick<
  Poll,
  "closesAt" | "closedAt" | "allowVoteChange" | "isAnonymous" | "requireLogin" | "resultsVisibility" | "visibility"
>;

export type Viewer = {
  userId: string | null;
  isOwner: boolean;
  hasVoted: boolean;
  /** Invited directly or through a linked group. Only matters on private polls. */
  isInvited: boolean;
};

export type Decision<Reason extends string> = { allowed: true } | { allowed: false; reason: Reason };

const allow = { allowed: true } as const;
const deny = <R extends string>(reason: R) => ({ allowed: false, reason }) as const;

export type AccessDenial = "LOGIN_REQUIRED" | "NOT_INVITED";

/**
 * Whether the viewer may see the poll at all. Private polls are for the owner
 * and invitees only, so they always need an account to tell who's asking.
 */
export function canAccessPoll(poll: PollRules, viewer: Viewer): Decision<AccessDenial> {
  if (poll.visibility === "PUBLIC" || viewer.isOwner) return allow;
  if (!viewer.userId) return deny(ErrorCode.LOGIN_REQUIRED);
  return viewer.isInvited ? allow : deny(ErrorCode.NOT_INVITED);
}

export function canViewVotePage(poll: PollRules, viewer: Viewer): Decision<AccessDenial> {
  const access = canAccessPoll(poll, viewer);
  if (!access.allowed) return access;
  return poll.requireLogin && !viewer.userId ? deny(ErrorCode.LOGIN_REQUIRED) : allow;
}

export type VoteDenial = "POLL_CLOSED" | "ALREADY_VOTED" | AccessDenial;

/** Submitting a new vote, or replacing an existing one. Owners vote like anyone. */
export function canVote(poll: PollRules, viewer: Viewer, now: Date = new Date()): Decision<VoteDenial> {
  const access = canAccessPoll(poll, viewer);
  if (!access.allowed) return access;
  if (!isPollOpen(poll, now)) return deny(ErrorCode.POLL_CLOSED);
  if (poll.requireLogin && !viewer.userId) return deny(ErrorCode.LOGIN_REQUIRED);
  if (viewer.hasVoted && !poll.allowVoteChange) return deny(ErrorCode.ALREADY_VOTED);
  return allow;
}

/** Withdrawing a vote follows the same rule as changing it. */
export function canWithdrawVote(
  poll: PollRules,
  viewer: Viewer,
  now: Date = new Date(),
): Decision<"POLL_CLOSED" | "VOTE_CHANGE_DISABLED" | "NOT_FOUND" | AccessDenial> {
  const access = canAccessPoll(poll, viewer);
  if (!access.allowed) return access;
  if (!viewer.hasVoted) return deny(ErrorCode.NOT_FOUND);
  if (!isPollOpen(poll, now)) return deny(ErrorCode.POLL_CLOSED);
  if (!poll.allowVoteChange) return deny(ErrorCode.VOTE_CHANGE_DISABLED);
  return allow;
}

export type ResultsDenial = "AFTER_VOTE" | "AFTER_CLOSE" | "OWNER_ONLY";

export function canViewResults(
  poll: PollRules,
  viewer: Viewer,
  now: Date = new Date(),
): Decision<ResultsDenial | AccessDenial> {
  if (viewer.isOwner) return allow;
  // On a private poll, "PUBLIC" results mean everyone invited.
  const access = canAccessPoll(poll, viewer);
  if (!access.allowed) return access;
  const closed = !isPollOpen(poll, now);
  switch (poll.resultsVisibility) {
    case "PUBLIC":
      return allow;
    case "AFTER_VOTE":
      return viewer.hasVoted || closed ? allow : deny("AFTER_VOTE");
    case "AFTER_CLOSE":
      return closed ? allow : deny("AFTER_CLOSE");
    case "OWNER_ONLY":
      return deny("OWNER_ONLY");
  }
}

/** Names are never revealed on anonymous polls, not even to the owner. */
export function canSeeVoterNames(poll: PollRules, viewer: Viewer, now: Date = new Date()): boolean {
  return !poll.isAnonymous && canViewResults(poll, viewer, now).allowed;
}

export function canManage(viewer: Viewer): boolean {
  return viewer.isOwner;
}
