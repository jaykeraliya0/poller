import type { Poll } from "@/generated/prisma/client";

export type PollTiming = Pick<Poll, "closesAt" | "closedAt">;

export type PollStatus = "OPEN" | "CLOSING_SOON" | "CLOSED";

/** A poll is flagged "closing soon" inside this window before its deadline. */
const CLOSING_SOON_MS = 24 * 60 * 60 * 1000;

/** The moment voting stopped, or null while the poll is still open. */
export function getClosedAt(poll: PollTiming, now: Date = new Date()): Date | null {
  if (poll.closedAt && poll.closedAt <= now) return poll.closedAt;
  if (poll.closesAt && poll.closesAt <= now) return poll.closesAt;
  return null;
}

export function isPollOpen(poll: PollTiming, now: Date = new Date()): boolean {
  return getClosedAt(poll, now) === null;
}

export function getPollStatus(poll: PollTiming, now: Date = new Date()): PollStatus {
  if (!isPollOpen(poll, now)) return "CLOSED";
  if (poll.closesAt && poll.closesAt.getTime() - now.getTime() <= CLOSING_SOON_MS) {
    return "CLOSING_SOON";
  }
  return "OPEN";
}

/** Reopening a poll whose deadline has passed needs a new deadline (or none). */
export function deadlinePassed(poll: PollTiming, now: Date = new Date()): boolean {
  return poll.closesAt !== null && poll.closesAt <= now;
}
