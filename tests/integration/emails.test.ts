import { beforeEach, describe, expect, it, vi } from "vitest";
import { addInvitesAction, sendRemindersAction } from "@/actions/invites";
import { closePollAction, reopenPollAction } from "@/actions/polls";
import { requestPasswordReset, resetPassword, sendVerificationEmail, verifyEmail } from "@/lib/auth/account-emails";
import { issueEmailToken } from "@/lib/auth/email-tokens";
import { getCurrentUser } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { verifyCredentials } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { listPendingInvitees, notifyInvitees, notifyLinkedGroupMembers, notifyNewGroupMembers, runScheduledEmails } from "@/lib/email/poll-emails";
import { addMembers, createGroup } from "@/lib/groups/service";
import { addInvites, setPollGroups } from "@/lib/poll/invites";
import { castVote, type VoterIdentity } from "@/lib/poll/votes";
import { createChoicePoll, createUser, resetDatabase } from "@/tests/setup/db";
import { flushEmails } from "@/tests/setup/email";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const HOUR = 3_600_000;
const signInAs = (id: string, authAt = Date.now()) => auth.mockResolvedValue({ user: { id, name: "Someone" }, authAt });

type User = Awaited<ReturnType<typeof createUser>>;
const as = (user: User): VoterIdentity => ({
  userId: user.id,
  userName: user.name,
  userEmail: user.email,
  userEmailVerified: user.emailVerifiedAt !== null,
  voterToken: crypto.randomUUID(),
});
const recipients = (emails: { to: string }[]) => emails.map((email) => email.to).sort();
/** The token from the only link in an email's text. */
const tokenIn = (text: string) => /token=([\w-]+)/.exec(text)![1];

beforeEach(async () => {
  await resetDatabase();
  await flushEmails();
  auth.mockReset();
});

describe("email verification", () => {
  it("emails a single-use link that confirms the address", async () => {
    const user = await createUser("Ana", { verified: false });
    await sendVerificationEmail(user.id);
    const [email] = await flushEmails();
    expect(email).toMatchObject({ to: user.email, subject: "Confirm your email for Poller" });

    const token = tokenIn(email.text);
    await expect(verifyEmail(token)).resolves.toBe(user.id);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerifiedAt).toBeInstanceOf(Date);
    await expect(verifyEmail(token)).resolves.toBeNull();
  });

  it("only honours the newest link, and not after it expires", async () => {
    const user = await createUser("Ana", { verified: false });
    const older = await issueEmailToken(user.id, "VERIFY_EMAIL");
    const newer = await issueEmailToken(user.id, "VERIFY_EMAIL");
    await expect(verifyEmail(older)).resolves.toBeNull();
    await expect(verifyEmail(newer, new Date(Date.now() + 49 * HOUR))).resolves.toBeNull();
    await expect(verifyEmail(newer)).resolves.toBe(user.id);
  });

  it("rejects junk and tokens meant for something else", async () => {
    const user = await createUser("Ana", { verified: false });
    await expect(verifyEmail("nope")).resolves.toBeNull();
    await expect(verifyEmail(null)).resolves.toBeNull();
    await expect(verifyEmail(await issueEmailToken(user.id, "RESET_PASSWORD"))).resolves.toBeNull();
  });

  it("sends nothing to an address that's already confirmed", async () => {
    await sendVerificationEmail((await createUser("Ana")).id);
    expect(await flushEmails()).toEqual([]);
  });

  it("keeps an unconfirmed invitee out of a private poll until they confirm", async () => {
    const owner = await createUser("Owner");
    const invitee = await createUser("Invitee", { verified: false });
    const poll = await createChoicePoll(owner.id, ["A", "B"], { visibility: "PRIVATE" });
    await addInvites(poll, invitee.email);
    const vote = (user: User) => castVote({ slug: poll.slug, answers: { optionIds: [poll.options[0].id] } }, as(user));

    await expect(vote(invitee)).rejects.toMatchObject({ code: "EMAIL_UNVERIFIED" });
    const confirmed = await db.user.update({ where: { id: invitee.id }, data: { emailVerifiedAt: new Date() } });
    await expect(vote(confirmed)).resolves.toMatchObject({ updated: false });
  });
});

describe("password reset", () => {
  const password = "correct horse battery";

  it("says nothing and sends nothing for an unknown address", async () => {
    await requestPasswordReset("nobody@example.com");
    expect(await flushEmails()).toEqual([]);
  });

  it("sets a new password once, confirms the email, and signs out older sessions", async () => {
    const user = await db.user.update({
      where: { id: (await createUser("Ana", { verified: false })).id },
      data: { passwordHash: await hashPassword("old password!") },
    });
    const signedInBefore = Date.now() - 1_000;

    await requestPasswordReset(user.email);
    const [email] = await flushEmails();
    expect(email).toMatchObject({ to: user.email, subject: "Reset your Poller password" });
    const token = tokenIn(email.text);

    await expect(resetPassword({ token, password: "short" })).rejects.toMatchObject({ code: "VALIDATION" });
    // A failed attempt doesn't use up the link.
    await resetPassword({ token, password });

    await expect(verifyCredentials({ email: user.email, password })).resolves.toMatchObject({ id: user.id });
    await expect(verifyCredentials({ email: user.email, password: "old password!" })).resolves.toBeNull();
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerifiedAt).toBeInstanceOf(Date);
    await expect(resetPassword({ token, password: "another password" })).rejects.toMatchObject({ code: "VALIDATION" });

    signInAs(user.id, signedInBefore);
    await expect(getCurrentUser()).resolves.toBeNull();
    signInAs(user.id);
    await expect(getCurrentUser()).resolves.toMatchObject({ id: user.id, emailVerified: true });
  });

  it("expires after an hour", async () => {
    const user = await createUser("Ana");
    const token = await issueEmailToken(user.id, "RESET_PASSWORD");
    await expect(resetPassword({ token, password }, new Date(Date.now() + 61 * 60_000))).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });
});

describe("invitation emails", () => {
  let owner: User;
  let poll: Awaited<ReturnType<typeof createChoicePoll>>;

  beforeEach(async () => {
    owner = await createUser("Owner");
    poll = await createChoicePoll(owner.id, ["A", "B"], { visibility: "PRIVATE", title: "Offsite <venue>" });
  });

  it("emails each invitee once, however they were added, and never the owner", async () => {
    const member = await createUser("Member");
    await expect(notifyInvitees(poll.id, ["a@example.com", "A@example.com", owner.email])).resolves.toBe(1);
    const [invite] = await flushEmails();
    expect(invite).toMatchObject({ to: "a@example.com", subject: "Owner invited you to vote: Offsite <venue>" });
    expect(invite.html).toContain("Offsite &lt;venue&gt;");
    expect(invite.text).toContain(`/p/${poll.slug}`);

    const group = await createGroup(owner.id, { name: "Team", emails: `a@example.com, ${member.email}` });
    await setPollGroups(poll, [group.id]);
    await notifyLinkedGroupMembers(poll.id, [group.id]);
    expect(recipients(await flushEmails())).toEqual([member.email.toLowerCase()]);

    await addMembers(group.id, "late@example.com");
    await notifyNewGroupMembers(group.id, ["late@example.com"]);
    expect(recipients(await flushEmails())).toEqual(["late@example.com"]);
  });

  it("go out when the owner invites people from the poll", async () => {
    signInAs(owner.id);
    await expect(addInvitesAction(poll.id, "new@example.com")).resolves.toEqual({ ok: true, data: { added: 1 } });
    expect(recipients(await flushEmails())).toEqual(["new@example.com"]);
  });

  it("skips people who turned poll emails off", async () => {
    const quiet = await db.user.update({ where: { id: (await createUser("Quiet")).id }, data: { emailNotifications: false } });
    await notifyInvitees(poll.id, [quiet.email, "b@example.com"]);
    expect(recipients(await flushEmails())).toEqual(["b@example.com"]);
  });

  it("stays quiet for public and closed polls", async () => {
    const open = await createChoicePoll(owner.id);
    await expect(notifyInvitees(open.id, ["a@example.com"])).resolves.toBe(0);
    await db.poll.update({ where: { id: poll.id }, data: { closedAt: new Date() } });
    await expect(notifyInvitees(poll.id, ["a@example.com"])).resolves.toBe(0);
    expect(await flushEmails()).toEqual([]);
  });
});

describe("reminders", () => {
  let owner: User;
  let voter: User;
  let poll: Awaited<ReturnType<typeof createChoicePoll>>;

  beforeEach(async () => {
    owner = await createUser("Owner");
    voter = await createUser("Voter");
    poll = await createChoicePoll(owner.id, ["A", "B"], {
      visibility: "PRIVATE",
      closesAt: new Date(Date.now() + 12 * HOUR),
      createdAt: new Date(Date.now() - 48 * HOUR),
    });
    const group = await createGroup(owner.id, { name: "Team", emails: "g@example.com" });
    await setPollGroups(poll, [group.id]);
    await addInvites(poll, `${voter.email}, d@example.com, ${owner.email}`);
    await castVote({ slug: poll.slug, answers: { optionIds: [poll.options[0].id] } }, as(voter));
    signInAs(owner.id);
  });

  it("go to everyone invited who hasn't voted", async () => {
    await expect(listPendingInvitees(poll.id)).resolves.toEqual(["d@example.com", "g@example.com"]);
    await expect(sendRemindersAction(poll.id)).resolves.toEqual({ ok: true, data: { pending: 2 } });
    const sent = await flushEmails();
    expect(recipients(sent)).toEqual(["d@example.com", "g@example.com"]);
    expect(sent[0].subject).toMatch(/^Reminder: voting closes in 1[12] hours$/);
  });

  it("can be sent by hand once every 12 hours", async () => {
    await sendRemindersAction(poll.id);
    await expect(sendRemindersAction(poll.id)).resolves.toMatchObject({ ok: false, code: "RATE_LIMITED" });
    await db.poll.update({ where: { id: poll.id }, data: { remindedAt: new Date(Date.now() - 13 * HOUR) } });
    await expect(sendRemindersAction(poll.id)).resolves.toMatchObject({ ok: true });
  });

  it("need someone left to remind, on an open private poll", async () => {
    await db.pollInvite.deleteMany({ where: { email: "d@example.com" } });
    await db.pollGroup.deleteMany();
    await expect(sendRemindersAction(poll.id)).resolves.toMatchObject({ ok: false, code: "CONFLICT" });
    await db.poll.update({ where: { id: poll.id }, data: { visibility: "PUBLIC" } });
    await expect(sendRemindersAction(poll.id)).resolves.toMatchObject({ ok: false, code: "VALIDATION" });
  });

  it("go out automatically once, a day before the deadline", async () => {
    await expect(runScheduledEmails()).resolves.toEqual({ reminders: 2, results: 0 });
    await expect(runScheduledEmails()).resolves.toEqual({ reminders: 0, results: 0 });
    expect(await flushEmails()).toHaveLength(2);
  });

  it("aren't sent automatically for a brand-new poll or right after a manual one", async () => {
    await db.poll.update({ where: { id: poll.id }, data: { createdAt: new Date() } });
    await expect(runScheduledEmails()).resolves.toMatchObject({ reminders: 0 });

    await db.poll.update({ where: { id: poll.id }, data: { createdAt: new Date(Date.now() - 48 * HOUR), remindedAt: new Date() } });
    await expect(runScheduledEmails()).resolves.toMatchObject({ reminders: 0 });
    expect(await flushEmails()).toEqual([]);
  });
});

describe("results emails", () => {
  let owner: User;
  let poll: Awaited<ReturnType<typeof createChoicePoll>>;
  let voters: User[];

  beforeEach(async () => {
    owner = await createUser("Owner");
    poll = await createChoicePoll(owner.id, ["Pizza", "Tacos"], { title: "Lunch" });
    voters = [await createUser("V1"), await createUser("V2"), await createUser("Unconfirmed", { verified: false })];
    for (const voter of voters) {
      await castVote({ slug: poll.slug, answers: { optionIds: [poll.options[0].id] } }, as(voter));
    }
    // A guest vote: counted, but there's no one to email.
    await castVote(
      { slug: poll.slug, answers: { optionIds: [poll.options[1].id] }, voterName: "Guest" },
      { userId: null, userName: null, userEmail: null, userEmailVerified: false, voterToken: crypto.randomUUID() },
    );
    signInAs(owner.id);
  });

  it("go to the owner and confirmed voters when the owner closes the poll", async () => {
    await closePollAction(poll.id);
    const sent = await flushEmails();
    expect(recipients(sent)).toEqual([owner.email, voters[0].email, voters[1].email].sort());
    const toOwner = sent.find((email) => email.to === owner.email)!;
    expect(toOwner.text).toContain(`/polls/${poll.id}/manage`);
    const toVoter = sent.find((email) => email.to === voters[0].email)!;
    expect(toVoter).toMatchObject({ subject: "Results are in: Lunch" });
    expect(toVoter.text).toContain("Pizza");
    expect(toVoter.text).toContain(`/p/${poll.slug}/results`);
  });

  it("are sent once per close, and again after a reopen and close", async () => {
    await closePollAction(poll.id);
    await flushEmails();
    await expect(runScheduledEmails()).resolves.toMatchObject({ results: 0 });

    await reopenPollAction(poll.id);
    await closePollAction(poll.id);
    expect(await flushEmails()).toHaveLength(3);
  });

  it("only reach the owner when results are owner-only", async () => {
    await db.poll.update({ where: { id: poll.id }, data: { resultsVisibility: "OWNER_ONLY" } });
    await closePollAction(poll.id);
    expect(recipients(await flushEmails())).toEqual([owner.email]);
  });

  it("go out on schedule when the deadline passes, but not for long-closed polls", async () => {
    await db.poll.update({ where: { id: poll.id }, data: { closesAt: new Date(Date.now() - HOUR) } });
    const old = await createChoicePoll(owner.id, ["A"], { closesAt: new Date(Date.now() - 30 * HOUR) });
    await expect(runScheduledEmails()).resolves.toEqual({ reminders: 0, results: 3 });
    expect((await db.poll.findUniqueOrThrow({ where: { id: old.id } })).resultsEmailedAt).toBeNull();
  });
});
