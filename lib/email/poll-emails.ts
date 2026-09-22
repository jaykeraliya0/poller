import "server-only";
import { db } from "@/lib/db";
import { formatRelative } from "@/lib/datetime";
import { AppError, ErrorCode } from "@/lib/errors";
import { computeInsights } from "@/lib/insights";
import { isPollOpen } from "@/lib/poll/status";
import { appUrl, pollShareUrl } from "@/lib/urls";
import { pollInviteTemplate, pollReminderTemplate, pollResultsTemplate } from "./templates";
import { sendEmails, type EmailMessage } from "./transport";

const HOUR = 60 * 60 * 1000;

/** How long after a manual reminder before the owner can send another. */
export const REMINDER_COOLDOWN_MS = 12 * HOUR;
/** The automatic reminder goes out inside this window before the deadline… */
const AUTO_REMINDER_WINDOW_MS = 24 * HOUR;
/** …but only for polls that have been open at least this long, so a short poll isn't nagged at creation. */
const AUTO_REMINDER_MIN_AGE_MS = 12 * HOUR;
/** Polls that closed longer ago than this never get a results email (e.g. the scheduler was down). */
const RESULTS_EMAIL_MAX_AGE_MS = 24 * HOUR;

const settingsUrl = () => appUrl("/settings#email-heading");
const lower = (email: string) => email.toLowerCase();

/** Drops addresses whose account turned poll emails off. Addresses without an account are kept. */
async function withoutOptedOut(emails: string[]): Promise<string[]> {
  if (emails.length === 0) return [];
  const optedOut = await db.user.findMany({
    where: { email: { in: emails }, emailNotifications: false },
    select: { email: true },
  });
  const skip = new Set(optedOut.map((user) => lower(user.email)));
  return emails.filter((email) => !skip.has(lower(email)));
}

const pollForEmail = {
  id: true,
  slug: true,
  title: true,
  description: true,
  visibility: true,
  closesAt: true,
  closedAt: true,
  remindedAt: true,
  creator: { select: { name: true, email: true } },
} as const;

function pollSummary(poll: { title: string; description: string | null; closesAt: Date | null }, now: Date) {
  return {
    title: poll.title,
    description: poll.description,
    closesIn: poll.closesAt ? formatRelative(poll.closesAt, now) : null,
  };
}

/**
 * Emails people who just got access to an open private poll, directly or
 * through a group. Each address hears about a poll once, however many times
 * it's added. Returns how many emails were sent.
 */
export async function notifyInvitees(pollId: string, emails: string[], now: Date = new Date()): Promise<number> {
  const poll = await db.poll.findUnique({ where: { id: pollId }, select: pollForEmail });
  if (!poll || poll.visibility !== "PRIVATE" || !isPollOpen(poll, now)) return 0;

  const owner = lower(poll.creator.email);
  const candidates = await withoutOptedOut([...new Set(emails.map(lower))].filter((email) => email !== owner));
  if (candidates.length === 0) return 0;

  // Claim the addresses first: with skipDuplicates only rows actually inserted come back,
  // so two overlapping calls can't both email the same person.
  const claimed = await db.pollInviteEmail.createManyAndReturn({
    data: candidates.map((email) => ({ pollId, email })),
    skipDuplicates: true,
    select: { email: true },
  });

  const summary = pollSummary(poll, now);
  await sendEmails(
    claimed.map(({ email }) => ({
      to: email,
      ...pollInviteTemplate({
        ownerName: poll.creator.name,
        email,
        poll: summary,
        url: pollShareUrl(poll.slug),
        settingsUrl: settingsUrl(),
      }),
    })),
  );
  return claimed.length;
}

/** New members of a group get told about each open private poll the group is shared with. */
export async function notifyNewGroupMembers(groupId: string, emails: string[], now: Date = new Date()) {
  const links = await db.pollGroup.findMany({ where: { groupId, poll: { visibility: "PRIVATE" } }, select: { pollId: true } });
  for (const { pollId } of links) await notifyInvitees(pollId, emails, now);
}

/** Linking groups to a poll tells their members about it. */
export async function notifyLinkedGroupMembers(pollId: string, groupIds: string[], now: Date = new Date()) {
  if (groupIds.length === 0) return;
  const members = await db.groupMember.findMany({ where: { groupId: { in: groupIds } }, select: { email: true } });
  await notifyInvitees(pollId, members.map((member) => member.email), now);
}

/**
 * Everyone invited to a private poll (directly or through a linked group) who
 * hasn't voted from an account with that address yet. Private polls need an
 * account to vote, so every voter is matched.
 */
export async function listPendingInvitees(pollId: string): Promise<string[]> {
  const poll = await db.poll.findUniqueOrThrow({
    where: { id: pollId },
    select: {
      creator: { select: { email: true } },
      invites: { select: { email: true } },
      groups: { select: { group: { select: { members: { select: { email: true } } } } } },
      responses: { where: { userId: { not: null } }, select: { user: { select: { email: true } } } },
    },
  });
  const voted = new Set(poll.responses.flatMap((response) => (response.user ? [lower(response.user.email)] : [])));
  voted.add(lower(poll.creator.email));
  const invited = new Set([
    ...poll.invites.map((invite) => lower(invite.email)),
    ...poll.groups.flatMap((link) => link.group.members.map((member) => lower(member.email))),
  ]);
  return [...invited].filter((email) => !voted.has(email)).sort();
}

async function sendReminders(pollId: string, now: Date): Promise<number> {
  const poll = await db.poll.findUniqueOrThrow({ where: { id: pollId }, select: pollForEmail });
  if (poll.visibility !== "PRIVATE" || !isPollOpen(poll, now)) return 0;
  const recipients = await withoutOptedOut(await listPendingInvitees(pollId));
  const summary = pollSummary(poll, now);
  await sendEmails(
    recipients.map((email) => ({
      to: email,
      ...pollReminderTemplate({
        ownerName: poll.creator.name,
        poll: summary,
        url: pollShareUrl(poll.slug),
        settingsUrl: settingsUrl(),
      }),
    })),
  );
  return recipients.length;
}

export type ReminderStatus = { pending: number; nextReminderAt: Date | null };

/** What the owner's reminder button needs: who's left, and when it can be pressed again. */
export async function getReminderStatus(
  poll: { id: string; remindedAt: Date | null },
  now: Date = new Date(),
): Promise<ReminderStatus> {
  const pending = (await listPendingInvitees(poll.id)).length;
  const nextAt = poll.remindedAt ? new Date(poll.remindedAt.getTime() + REMINDER_COOLDOWN_MS) : null;
  return { pending, nextReminderAt: nextAt && nextAt > now ? nextAt : null };
}

/**
 * Checks and claims the owner's manual reminder, returning how many people
 * will be emailed. The send itself is left to the caller (deferred), via
 * `sendClaimedReminders`.
 */
export async function claimManualReminder(
  poll: { id: string; visibility: string; closesAt: Date | null; closedAt: Date | null },
  now: Date = new Date(),
): Promise<{ pending: number }> {
  if (poll.visibility !== "PRIVATE") {
    throw new AppError(ErrorCode.VALIDATION, "Reminders are for private polls, where we know who was invited.");
  }
  if (!isPollOpen(poll, now)) throw new AppError(ErrorCode.POLL_CLOSED, "This poll is closed, so there's nothing to remind people about.");

  const pending = (await listPendingInvitees(poll.id)).length;
  if (pending === 0) throw new AppError(ErrorCode.CONFLICT, "Everyone you invited has already voted.");

  // Conditional update: two quick clicks (or two tabs) can't both send.
  const { count } = await db.poll.updateMany({
    where: { id: poll.id, OR: [{ remindedAt: null }, { remindedAt: { lte: new Date(now.getTime() - REMINDER_COOLDOWN_MS) } }] },
    data: { remindedAt: now },
  });
  if (count === 0) {
    throw new AppError(ErrorCode.RATE_LIMITED, "You sent a reminder recently. You can send another 12 hours after the last one.");
  }
  return { pending };
}

export function sendClaimedReminders(pollId: string, now: Date = new Date()) {
  return sendReminders(pollId, now);
}

/**
 * The "poll closed" email: the owner gets a link to the manage page, and
 * everyone who voted from an account gets the results, unless results are
 * owner-only. Only confirmed addresses, and only once per close.
 */
export async function sendResultsEmail(pollId: string, now: Date = new Date()): Promise<number> {
  const poll = await db.poll.findUnique({
    where: { id: pollId },
    include: {
      creator: { select: { email: true, emailVerifiedAt: true, emailNotifications: true } },
      options: { orderBy: { position: "asc" } },
      responses: {
        select: {
          id: true,
          voterName: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
          answers: { select: { optionId: true, value: true } },
          user: { select: { email: true, emailVerifiedAt: true, emailNotifications: true } },
        },
      },
    },
  });
  if (!poll || isPollOpen(poll, now)) return 0;

  const { count } = await db.poll.updateMany({ where: { id: pollId, resultsEmailedAt: null }, data: { resultsEmailedAt: now } });
  if (count === 0) return 0;

  const insights = computeInsights({ poll, options: poll.options, responses: poll.responses, now });
  const headline = insights.byType.headline;
  const shared = { title: poll.title, responses: poll.responses.length, headline, settingsUrl: settingsUrl() };
  const wantsEmail = (user: { emailVerifiedAt: Date | null; emailNotifications: boolean } | null) =>
    Boolean(user?.emailVerifiedAt && user.emailNotifications);

  const messages: EmailMessage[] = [];
  const owner = lower(poll.creator.email);
  if (wantsEmail(poll.creator)) {
    messages.push({
      to: poll.creator.email,
      ...pollResultsTemplate({ ...shared, isOwner: true, url: appUrl(`/polls/${poll.id}/manage`) }),
    });
  }
  if (poll.resultsVisibility !== "OWNER_ONLY") {
    const voters = new Set<string>();
    for (const { user } of poll.responses) {
      if (!user || !wantsEmail(user) || lower(user.email) === owner) continue;
      voters.add(user.email);
    }
    for (const email of voters) {
      messages.push({ to: email, ...pollResultsTemplate({ ...shared, isOwner: false, url: appUrl(`/p/${poll.slug}/results`) }) });
    }
  }
  await sendEmails(messages);
  return messages.length;
}

/**
 * The scheduled job (see /api/cron/emails): automatic reminders for private
 * polls closing within a day, and results emails for polls whose deadline
 * passed. Safe to run as often as you like; every send is claimed first.
 */
export async function runScheduledEmails(now: Date = new Date()) {
  const dueForReminder = await db.poll.findMany({
    where: {
      visibility: "PRIVATE",
      closedAt: null,
      closesAt: { gt: now, lte: new Date(now.getTime() + AUTO_REMINDER_WINDOW_MS) },
      autoRemindedAt: null,
      createdAt: { lte: new Date(now.getTime() - AUTO_REMINDER_MIN_AGE_MS) },
    },
    select: { id: true, remindedAt: true },
  });

  let reminders = 0;
  for (const poll of dueForReminder) {
    const { count } = await db.poll.updateMany({ where: { id: poll.id, autoRemindedAt: null }, data: { autoRemindedAt: now } });
    if (count === 0) continue;
    // The owner nudged people recently themselves: don't send a second reminder on top.
    if (poll.remindedAt && now.getTime() - poll.remindedAt.getTime() < REMINDER_COOLDOWN_MS) continue;
    reminders += await sendReminders(poll.id, now);
  }

  const cutoff = new Date(now.getTime() - RESULTS_EMAIL_MAX_AGE_MS);
  const justClosed = await db.poll.findMany({
    where: {
      resultsEmailedAt: null,
      OR: [
        { closedAt: { gt: cutoff, lte: now } },
        { closedAt: null, closesAt: { gt: cutoff, lte: now } },
      ],
    },
    select: { id: true },
  });

  let results = 0;
  for (const poll of justClosed) results += await sendResultsEmail(poll.id, now);

  return { reminders, results };
}
