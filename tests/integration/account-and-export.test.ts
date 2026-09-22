import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAccountAction } from "@/actions/account";
import { GET as exportCsv } from "@/app/api/polls/[id]/export/route";
import { db } from "@/lib/db";
import { castVote } from "@/lib/poll/votes";
import { createAvailabilityPoll, createChoicePoll, createUser, resetDatabase } from "@/tests/setup/db";

const { auth, signOut } = vi.hoisted(() => ({ auth: vi.fn(), signOut: vi.fn() }));
vi.mock("@/auth", () => ({ auth, signOut }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const signInAs = (user: { id: string; name: string }) => auth.mockResolvedValue({ user });
const form = (confirmation: string) => {
  const data = new FormData();
  data.set("confirmation", confirmation);
  return data;
};
const guest = () => ({ userId: null, userName: null, userEmail: null, userEmailVerified: false, voterToken: crypto.randomUUID() });

describe("deleteAccountAction", () => {
  beforeEach(async () => {
    await resetDatabase();
    signOut.mockReset();
  });

  it("requires typing the email and keeps the account otherwise", async () => {
    const user = await createUser();
    signInAs(user);
    const state = await deleteAccountAction(null, form("nope@example.com"));
    expect(state).toMatchObject({ code: "VALIDATION", fieldErrors: { confirmation: [expect.any(String)] } });
    expect(await db.user.count()).toBe(1);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("deletes the account and their polls, keeps their votes elsewhere unlinked, and signs out", async () => {
    const [leaving, other] = [await createUser("Leaving"), await createUser("Other")];
    const ownPoll = await createChoicePoll(leaving.id);
    const otherPoll = await createChoicePoll(other.id);
    await castVote({ slug: otherPoll.slug, answers: { optionIds: [otherPoll.options[0].id] }, voterName: "L" }, {
      userId: leaving.id,
      userName: "Leaving",
      userEmail: leaving.email,
      userEmailVerified: true,
      voterToken: "t",
    });
    signInAs(leaving);

    await deleteAccountAction(null, form(`  ${leaving.email.toUpperCase()} `));

    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/?account=deleted" });
    expect(await db.user.findUnique({ where: { id: leaving.id } })).toBeNull();
    expect(await db.poll.findUnique({ where: { id: ownPoll.id } })).toBeNull();
    expect(await db.pollResponse.findFirstOrThrow({ where: { pollId: otherPoll.id } })).toMatchObject({ userId: null });
  });
});

describe("CSV export", () => {
  beforeEach(resetDatabase);

  const download = (pollId: string) => exportCsv(new Request("http://test"), { params: Promise.resolve({ id: pollId }) });

  it("exports one row per response with a column per option", async () => {
    const owner = await createUser();
    const poll = await createChoicePoll(owner.id, ["Pizza", "Sushi, fresh"]);
    await castVote(
      { slug: poll.slug, answers: { optionIds: [poll.options[1].id] }, voterName: "=cmd()", comment: 'Said "yes"' },
      guest(),
    );
    signInAs(owner);

    const response = await download(poll.id);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe(`attachment; filename="poll-${poll.slug}-responses.csv"`);
    const [header, row] = (await response.text()).replace(/^﻿/, "").trim().split("\r\n");
    expect(header).toBe('Submitted,Name,Pizza,"Sushi, fresh",Comment');
    expect(row).toMatch(/^\d{4}-\d{2}-\d{2}T[^,]+,'=cmd\(\),,1,"Said ""yes"""$/);
  });

  it("omits names and exact times on anonymous polls, and labels availability answers", async () => {
    const owner = await createUser();
    const poll = await createAvailabilityPoll(owner.id, 2);
    await db.poll.update({ where: { id: poll.id }, data: { isAnonymous: true } });
    await castVote(
      { slug: poll.slug, answers: { availability: { [poll.options[0].id]: 2, [poll.options[1].id]: 1 } } },
      guest(),
    );
    signInAs(owner);

    const [header, row] = (await (await download(poll.id)).text()).replace(/^﻿/, "").trim().split("\r\n");
    expect(header).not.toContain("Name");
    expect(row).toMatch(/^\d{4}-\d{2}-\d{2},Yes,If need be,$/);
  });

  it("returns 404 to anyone but the owner", async () => {
    const poll = await createChoicePoll((await createUser()).id);
    auth.mockResolvedValue(null);
    expect((await download(poll.id)).status).toBe(404);
    signInAs(await createUser("Intruder"));
    expect((await download(poll.id)).status).toBe(404);
    expect((await download("not-a-uuid")).status).toBe(404);
  });
});
