import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as downloadAccount } from "@/app/api/account/export/route";
import { db } from "@/lib/db";
import { castVote } from "@/lib/poll/votes";
import { createChoicePoll, createUser, resetDatabase } from "@/tests/setup/db";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth }));

const signInAs = (user: { id: string; name: string }) => auth.mockResolvedValue({ user });
const signOut = () => auth.mockResolvedValue(null);

const vote = (poll: { slug: string; options: { id: string }[] }, voter: { id: string; name: string; email: string }) =>
  castVote(
    { slug: poll.slug, answers: { optionIds: [poll.options[0].id] }, voterName: voter.name, comment: "my note" },
    { userId: voter.id, userName: voter.name, userEmail: voter.email, userEmailVerified: true, voterToken: voter.id },
  );

async function download() {
  const response = await downloadAccount();
  return { response, body: await response.text() };
}

describe("account data export", () => {
  beforeEach(resetDatabase);

  it("turns signed-out visitors away", async () => {
    signOut();
    const { response } = await download();
    expect(response.status).toBe(401);
  });

  it("downloads the profile, created polls, groups and votes cast elsewhere", async () => {
    const [owner, other] = [await createUser("Owner"), await createUser("Other")];
    const ownPoll = await createChoicePoll(owner.id, ["Tea", "Coffee"]);
    const otherPoll = await createChoicePoll(other.id, ["Now", "Later"]);
    await db.pollInvite.create({ data: { pollId: ownPoll.id, email: "guest@example.com" } });
    const group = await db.group.create({
      data: { ownerId: owner.id, name: "Team", members: { create: [{ email: "member@example.com" }] } },
    });
    await db.pollGroup.create({ data: { pollId: ownPoll.id, groupId: group.id } });
    await vote(ownPoll, { id: other.id, name: "Other", email: other.email });
    await vote(otherPoll, { id: owner.id, name: "Owner", email: owner.email });

    signInAs(owner);
    const { response, body } = await download();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toMatch(/attachment; filename="poller-account-\d{4}-\d\d-\d\d\.json"/);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const data = JSON.parse(body);
    expect(data).toMatchObject({ format: "poller.account-export", version: 1 });
    expect(data.account).toMatchObject({ id: owner.id, name: "Owner", email: owner.email, emailNotifications: true });

    expect(data.pollsCreated).toHaveLength(1);
    const [exported] = data.pollsCreated;
    expect(exported).toMatchObject({ id: ownPoll.id, title: "Test poll", url: expect.stringContaining(ownPoll.slug) });
    expect(exported.options.map((option: { label: string }) => option.label)).toEqual(["Tea", "Coffee"]);
    expect(exported.invitedEmails).toEqual([{ email: "guest@example.com", invitedAt: expect.any(String) }]);
    expect(exported.sharedWithGroups).toMatchObject([{ id: group.id, name: "Team" }]);
    // The vote the other user cast on the owner's poll, with the option labelled.
    expect(exported.responses).toMatchObject([
      { name: "Other", comment: "my note", answers: [{ option: "Tea", value: 1, display: "1" }] },
    ]);

    expect(data.groups).toMatchObject([{ name: "Team", members: [{ email: "member@example.com" }] }]);

    // Their own vote on someone else's poll, and not the one they received.
    expect(data.votesCast).toMatchObject([
      { poll: { id: otherPoll.id, title: "Test poll" }, comment: "my note", answers: [{ option: "Now" }] },
    ]);
  });

  it("keeps anonymous polls anonymous, as the per-poll export does", async () => {
    const [owner, voter] = [await createUser("Owner"), await createUser("Voter")];
    const poll = await createChoicePoll(owner.id, ["Yes", "No"], { isAnonymous: true });
    await vote(poll, { id: voter.id, name: "Voter", email: voter.email });

    signInAs(owner);
    const { body } = await download();
    const [response] = JSON.parse(body).pollsCreated[0].responses;

    expect(response.name).toBeUndefined();
    expect(response.submittedAt).toBeUndefined();
    expect(response.submittedOn).toMatch(/^\d{4}-\d\d-\d\d$/);
  });

  it("never reaches into another account", async () => {
    const [owner, other] = [await createUser("Owner"), await createUser("Other")];
    await createChoicePoll(other.id);
    await db.group.create({ data: { ownerId: other.id, name: "Theirs" } });

    signInAs(owner);
    const data = JSON.parse((await download()).body);

    expect(data.pollsCreated).toEqual([]);
    expect(data.groups).toEqual([]);
    expect(data.votesCast).toEqual([]);
  });
});
