import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerUser } from "@/lib/auth/users";
import { requireGroupOwner } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { addMembers, createGroup, deleteGroup, removeMember } from "@/lib/groups/service";
import { addInvites, listPollAccess, removeInvite, setPollGroups } from "@/lib/poll/invites";
import { listPollsSharedWith } from "@/lib/poll/service";
import { castVote, withdrawVote, type VoterIdentity } from "@/lib/poll/votes";
import { createChoicePoll, createUser, resetDatabase } from "@/tests/setup/db";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth }));

type User = { id: string; name: string; email: string };
const as = (user: User): VoterIdentity => ({
  userId: user.id,
  userName: user.name,
  userEmail: user.email,
  voterToken: crypto.randomUUID(),
});
const guest = (): VoterIdentity => ({ userId: null, userName: null, userEmail: null, voterToken: crypto.randomUUID() });

const listParams = { filter: "all", q: "", page: 1 } as const;

describe("private polls", () => {
  let owner: User;
  let poll: Awaited<ReturnType<typeof createChoicePoll>>;
  const vote = (identity: VoterIdentity) =>
    castVote({ slug: poll.slug, answers: { optionIds: [poll.options[0].id] }, voterName: "Voter" }, identity);

  beforeEach(async () => {
    await resetDatabase();
    owner = await createUser("Owner");
    poll = await createChoicePoll(owner.id, ["A", "B"], { visibility: "PRIVATE" });
  });

  it("turns away guests and people who weren't invited", async () => {
    await expect(vote(guest())).rejects.toMatchObject({ code: "LOGIN_REQUIRED" });
    await expect(vote(as(await createUser("Stranger")))).rejects.toMatchObject({ code: "NOT_INVITED" });
    expect(await db.pollResponse.count()).toBe(0);
  });

  it("lets the owner and direct invitees vote, matching email case-insensitively", async () => {
    const invitee = await createUser("Invitee");
    await addInvites(poll, `  ${invitee.email.toUpperCase()} `);

    await expect(vote(as(invitee))).resolves.toMatchObject({ updated: false, resultsVisible: true });
    await expect(vote(as(owner))).resolves.toMatchObject({ updated: false });
  });

  it("lets a pending invite through once that person signs up", async () => {
    await addInvites(poll, "later@example.com");
    const joined = await registerUser({ name: "Later", email: "Later@Example.com", password: "long-enough-pw" });
    await expect(vote(as({ ...joined, name: "Later" }))).resolves.toMatchObject({ updated: false });
  });

  it("follows group membership live, but keeps direct invites", async () => {
    const [member, both] = [await createUser("Member"), await createUser("Both")];
    const group = await createGroup(owner.id, { name: "Team", emails: `${member.email}, ${both.email}` });
    await setPollGroups(poll, [group.id]);
    await addInvites(poll, both.email);

    await expect(vote(as(member))).resolves.toMatchObject({ updated: false });

    await removeMember(group.id, member.email);
    await deleteGroup(group.id);
    await expect(withdrawVote(poll.slug, as(member))).rejects.toMatchObject({ code: "NOT_INVITED" });
    await expect(vote(as(both))).resolves.toMatchObject({ updated: false });
  });

  it("keeps invites and votes when switching to public and back", async () => {
    const invitee = await createUser("Invitee");
    await addInvites(poll, invitee.email);
    await vote(as(invitee));

    await db.poll.update({ where: { id: poll.id }, data: { visibility: "PUBLIC" } });
    await expect(vote(guest())).resolves.toMatchObject({ updated: false });

    await db.poll.update({ where: { id: poll.id }, data: { visibility: "PRIVATE" } });
    await expect(vote(guest())).rejects.toMatchObject({ code: "LOGIN_REQUIRED" });
    await expect(vote(as(invitee))).resolves.toMatchObject({ updated: true });
    expect(await db.pollResponse.count({ where: { pollId: poll.id } })).toBe(2);
  });
});

describe("managing invites", () => {
  let owner: User;
  let poll: Awaited<ReturnType<typeof createChoicePoll>>;

  beforeEach(async () => {
    await resetDatabase();
    owner = await createUser("Owner");
    poll = await createChoicePoll(owner.id, ["A", "B"], { visibility: "PRIVATE" });
  });

  it("skips duplicates and the owner's own address, and reports who has an account", async () => {
    const joined = await createUser("Joined");
    await expect(addInvites(poll, `${joined.email}, new@example.com, ${owner.email}`)).resolves.toEqual({ added: 2 });
    await expect(addInvites(poll, "NEW@example.com")).resolves.toEqual({ added: 0 });

    const access = await listPollAccess(poll);
    expect(access.invites.map(({ email, hasAccount }) => ({ email, hasAccount }))).toEqual([
      { email: joined.email.toLowerCase(), hasAccount: true },
      { email: "new@example.com", hasAccount: false },
    ]);
  });

  it("rejects a list with an invalid address without adding any", async () => {
    await expect(addInvites(poll, "ok@example.com, nope")).rejects.toMatchObject({
      code: "VALIDATION",
      fieldErrors: { emails: [expect.stringContaining("nope")] },
    });
    expect(await db.pollInvite.count()).toBe(0);
  });

  it("removes an invite only from its own poll", async () => {
    await addInvites(poll, "a@example.com");
    const [invite] = await db.pollInvite.findMany();
    const other = await createChoicePoll(owner.id);
    await expect(removeInvite(other.id, invite.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await removeInvite(poll.id, invite.id);
    expect(await db.pollInvite.count()).toBe(0);
  });

  it("only links the poll creator's own groups", async () => {
    const mine = await createGroup(owner.id, { name: "Mine" });
    const theirs = await createGroup((await createUser("Other")).id, { name: "Theirs" });

    await expect(setPollGroups(poll, [mine.id, theirs.id])).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await db.pollGroup.count()).toBe(0);

    await setPollGroups(poll, [mine.id]);
    expect((await listPollAccess(poll)).groups).toEqual([
      expect.objectContaining({ id: mine.id, linked: true, memberCount: 0 }),
    ]);
    await setPollGroups(poll, []);
    expect(await db.pollGroup.count()).toBe(0);
  });
});

describe("groups", () => {
  beforeEach(async () => {
    await resetDatabase();
    auth.mockReset();
  });

  it("are invisible to everyone but their owner", async () => {
    const [owner, other] = [await createUser("Owner"), await createUser("Other")];
    const group = await createGroup(owner.id, { name: "Team" });

    auth.mockResolvedValue({ user: { id: other.id } });
    await expect(requireGroupOwner(group.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(requireGroupOwner("not-a-uuid")).rejects.toMatchObject({ code: "NOT_FOUND" });

    auth.mockResolvedValue({ user: { id: owner.id } });
    await expect(requireGroupOwner(group.id)).resolves.toMatchObject({ group: { id: group.id } });
  });

  it("need unique names per owner, but different owners may reuse one", async () => {
    const [owner, other] = [await createUser("Owner"), await createUser("Other")];
    await createGroup(owner.id, { name: "Team" });
    await expect(createGroup(owner.id, { name: " Team " })).rejects.toMatchObject({
      fieldErrors: { name: ["You already have a group with that name"] },
    });
    await expect(createGroup(other.id, { name: "Team" })).resolves.toHaveProperty("id");
  });

  it("dedupes members", async () => {
    const owner = await createUser("Owner");
    const group = await createGroup(owner.id, { name: "Team", emails: "a@example.com" });
    await expect(addMembers(group.id, "A@example.com b@example.com")).resolves.toEqual({ added: 1 });
    expect(await db.groupMember.count({ where: { groupId: group.id } })).toBe(2);
  });
});

describe("polls shared with me", () => {
  beforeEach(resetDatabase);

  it("lists polls I'm invited to directly or by group, once each, and not my own", async () => {
    const [owner, me] = [await createUser("Owner"), await createUser("Me")];
    const direct = await createChoicePoll(owner.id, ["A", "B"], { title: "Direct", visibility: "PRIVATE" });
    const viaGroup = await createChoicePoll(owner.id, ["A", "B"], { title: "Group", visibility: "PRIVATE" });
    await createChoicePoll(owner.id, ["A", "B"], { title: "Not mine to see", visibility: "PRIVATE" });
    const own = await createChoicePoll(me.id, ["A", "B"], { title: "My own", visibility: "PRIVATE" });

    await addInvites(direct, me.email);
    await addInvites(viaGroup, me.email);
    const group = await createGroup(owner.id, { name: "Team", emails: me.email });
    await setPollGroups(viaGroup, [group.id]);
    await db.pollInvite.create({ data: { pollId: own.id, email: me.email } });

    await castVote({ slug: direct.slug, answers: { optionIds: [direct.options[0].id] } }, as(me));

    const result = await listPollsSharedWith(me, listParams);
    expect(result.total).toBe(2);
    expect(result.polls.map((poll) => [poll.title, poll.creator.name, poll.responses.length > 0])).toEqual([
      ["Group", "Owner", false],
      ["Direct", "Owner", true],
    ]);
  });
});
