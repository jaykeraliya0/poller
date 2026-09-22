import { beforeEach, describe, expect, it, vi } from "vitest";
import { deletePollAction, updatePollAction } from "@/actions/polls";
import { db } from "@/lib/db";
import type { PollSubmission } from "@/lib/poll/submission";
import { castVote } from "@/lib/poll/votes";
import { createAvailabilityPoll, createChoicePoll, createUser, resetDatabase } from "@/tests/setup/db";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const HOUR = 3_600_000;
const settings: PollSubmission["settings"] = {
  closesAt: null,
  allowVoteChange: true,
  isAnonymous: false,
  requireLogin: false,
  resultsVisibility: "PUBLIC",
  visibility: "PUBLIC",
  expectedParticipants: null,
};

type ChoicePoll = Awaited<ReturnType<typeof createChoicePoll>>;

/** The edit form's submission for a choice poll, with options as given. */
const edit = (poll: ChoicePoll, options: { id?: string; label: string }[], overrides: Partial<PollSubmission> = {}) => ({
  template: "CUSTOM",
  type: "CHOICE",
  title: poll.title,
  description: "",
  config: { multi: false, maxSelections: null },
  options,
  settings,
  ...overrides,
});

const voteOn = (poll: { slug: string }, optionId: string) =>
  castVote(
    { slug: poll.slug, answers: { optionIds: [optionId] }, voterName: "Voter" },
    { userId: null, userName: null, userEmail: null, voterToken: crypto.randomUUID() },
  );

const labelsOf = async (pollId: string) =>
  (await db.pollOption.findMany({ where: { pollId }, orderBy: { position: "asc" } })).map((o) => o.label);

describe("updatePollAction", () => {
  let poll: ChoicePoll;

  beforeEach(async () => {
    await resetDatabase();
    const owner = await createUser("Owner");
    poll = await createChoicePoll(owner.id, ["Pizza", "Sushi", "Tacos"]);
    auth.mockResolvedValue({ user: { id: owner.id, name: "Owner" } });
  });

  const [pizza, sushi, tacos] = [0, 1, 2];
  const option = (index: number, label = poll.options[index].label) => ({ id: poll.options[index].id, label });

  it("renames, reorders, adds and removes options before anyone votes", async () => {
    const result = await updatePollAction(
      poll.id,
      edit(poll, [option(tacos), option(pizza, "Pizza 🍕"), { label: "Ramen" }], { title: "Lunch v2" }),
    );
    expect(result).toEqual({ ok: true, data: undefined });
    expect(await labelsOf(poll.id)).toEqual(["Tacos", "Pizza 🍕", "Ramen"]);
    expect(await db.poll.findUniqueOrThrow({ where: { id: poll.id } })).toMatchObject({ title: "Lunch v2" });
  });

  it("keeps option ids stable, so existing votes follow a renamed option", async () => {
    await voteOn(poll, poll.options[sushi].id);
    await updatePollAction(poll.id, edit(poll, [option(pizza), option(sushi, "Sushi bar"), option(tacos)]));
    const answer = await db.answer.findFirstOrThrow({ include: { option: true } });
    expect(answer.option.label).toBe("Sushi bar");
  });

  it("lets the owner add an option after votes; it's marked as new for earlier voters", async () => {
    await voteOn(poll, poll.options[pizza].id);
    await updatePollAction(poll.id, edit(poll, [option(pizza), option(sushi), option(tacos), { label: "Burgers" }]));
    const [response, added] = await Promise.all([
      db.pollResponse.findFirstOrThrow(),
      db.pollOption.findFirstOrThrow({ where: { label: "Burgers" } }),
    ]);
    expect(added.createdAt > response.updatedAt).toBe(true);
  });

  it("refuses to remove an option that has votes, and changes nothing", async () => {
    await voteOn(poll, poll.options[tacos].id);
    const result = await updatePollAction(poll.id, edit(poll, [option(pizza), option(sushi)], { title: "Changed" }));
    expect(result).toMatchObject({
      ok: false,
      code: "VALIDATION",
      fieldErrors: { options: ['"Tacos" already has votes, so it can\'t be removed.'] },
    });
    expect(await labelsOf(poll.id)).toEqual(["Pizza", "Sushi", "Tacos"]);
    expect((await db.poll.findUniqueOrThrow({ where: { id: poll.id } })).title).toBe("Test poll");
  });

  it("still removes options without votes when others have votes", async () => {
    await voteOn(poll, poll.options[pizza].id);
    await updatePollAction(poll.id, edit(poll, [option(pizza), option(sushi)]));
    expect(await labelsOf(poll.id)).toEqual(["Pizza", "Sushi"]);
  });

  it("locks the type's config and anonymity once people have voted", async () => {
    await voteOn(poll, poll.options[pizza].id);
    const all = [option(pizza), option(sushi), option(tacos)];
    expect(
      await updatePollAction(poll.id, edit(poll, all, { config: { multi: true, maxSelections: null } })),
    ).toMatchObject({ fieldErrors: { config: [expect.any(String)] } });
    expect(await updatePollAction(poll.id, edit(poll, all, { settings: { ...settings, isAnonymous: true } }))).toMatchObject({
      fieldErrors: { "settings.isAnonymous": [expect.any(String)] },
    });
    // Everything else stays editable.
    expect(
      await updatePollAction(poll.id, edit(poll, all, { settings: { ...settings, resultsVisibility: "AFTER_CLOSE" } })),
    ).toMatchObject({ ok: true });
  });

  it("ignores attempts to change the poll type", async () => {
    await updatePollAction(poll.id, edit(poll, [option(pizza), option(sushi)], { type: "AVAILABILITY" }));
    expect((await db.poll.findUniqueOrThrow({ where: { id: poll.id } })).type).toBe("CHOICE");
  });

  it("rejects option ids from another poll", async () => {
    const other = await createChoicePoll(poll.creatorId);
    const result = await updatePollAction(poll.id, edit(poll, [option(pizza), { id: other.options[0].id, label: "Stolen" }]));
    expect(result).toMatchObject({ code: "VALIDATION", fieldErrors: { options: [expect.any(String)] } });
  });

  it("refuses to edit a closed poll, whether closed by hand or by its deadline", async () => {
    const all = [option(pizza), option(sushi), option(tacos)];
    const future = new Date(Date.now() + 24 * HOUR).toISOString();

    await db.poll.update({ where: { id: poll.id }, data: { closedAt: new Date() } });
    expect(await updatePollAction(poll.id, edit(poll, all, { title: "Changed" }))).toMatchObject({
      ok: false,
      code: "POLL_CLOSED",
      message: expect.stringMatching(/Reopen/),
    });

    // A new deadline doesn't sneak a reopen through the edit form either.
    await db.poll.update({ where: { id: poll.id }, data: { closedAt: null, closesAt: new Date(Date.now() - HOUR) } });
    expect(
      await updatePollAction(poll.id, edit(poll, all, { title: "Changed", settings: { ...settings, closesAt: future } })),
    ).toMatchObject({ ok: false, code: "POLL_CLOSED" });

    expect(await db.poll.findUniqueOrThrow({ where: { id: poll.id } })).toMatchObject({ title: "Test poll" });
    expect(await labelsOf(poll.id)).toEqual(["Pizza", "Sushi", "Tacos"]);
  });

  it("keeps an unchanged future deadline and rejects a past one", async () => {
    const deadline = new Date(Math.floor((Date.now() + 2 * HOUR) / 60_000) * 60_000);
    await db.poll.update({ where: { id: poll.id }, data: { closesAt: deadline } });
    const all = [option(pizza), option(sushi), option(tacos)];

    expect(
      await updatePollAction(poll.id, edit(poll, all, { settings: { ...settings, closesAt: deadline.toISOString() } })),
    ).toMatchObject({ ok: true });
    expect((await db.poll.findUniqueOrThrow({ where: { id: poll.id } })).closesAt).toEqual(deadline);

    const past = new Date(Date.now() - HOUR).toISOString();
    expect(await updatePollAction(poll.id, edit(poll, all, { settings: { ...settings, closesAt: past } }))).toMatchObject({
      fieldErrors: { "settings.closesAt": ["Deadline must be in the future"] },
    });
  });

  it("returns NOT_FOUND for someone else's poll", async () => {
    auth.mockResolvedValue({ user: { id: (await createUser()).id, name: "Intruder" } });
    expect(await updatePollAction(poll.id, edit(poll, [option(pizza), option(sushi)]))).toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("editing availability slots", () => {
  it("keeps stored times for existing slots and adds new ones in order", async () => {
    await resetDatabase();
    const owner = await createUser();
    auth.mockResolvedValue({ user: { id: owner.id, name: "Owner" } });
    const poll = await createAvailabilityPoll(owner.id, 2);
    const [first, second] = poll.options;
    const newSlot = new Date(first.startsAt!.getTime() - 24 * HOUR);

    const result = await updatePollAction(poll.id, {
      template: "EVENT_DATE",
      type: "AVAILABILITY",
      title: poll.title,
      description: "",
      config: { timezone: "UTC" },
      options: [
        // A tampered time for an existing slot is ignored.
        { id: first.id, startsAt: first.startsAt!.toISOString(), endsAt: new Date(first.endsAt!.getTime() + HOUR).toISOString() },
        { id: second.id, startsAt: second.startsAt!.toISOString(), endsAt: second.endsAt!.toISOString() },
        { startsAt: newSlot.toISOString(), endsAt: new Date(newSlot.getTime() + HOUR).toISOString() },
      ],
      settings,
    });
    expect(result).toMatchObject({ ok: true });

    const slots = await db.pollOption.findMany({ where: { pollId: poll.id }, orderBy: { position: "asc" } });
    expect(slots.map((slot) => slot.startsAt)).toEqual([newSlot, first.startsAt, second.startsAt]);
    expect(slots[1].endsAt).toEqual(first.endsAt);
  });
});

describe("deletePollAction", () => {
  beforeEach(resetDatabase);

  it("deletes the poll with its votes and redirects to the dashboard", async () => {
    const owner = await createUser();
    auth.mockResolvedValue({ user: { id: owner.id, name: "Owner" } });
    const poll = await createChoicePoll(owner.id);
    await voteOn(poll, poll.options[0].id);

    const error = await deletePollAction(poll.id).catch((e) => e);
    expect(String(error.digest)).toMatch(/^NEXT_REDIRECT;.*;\/dashboard\?deleted=1;/);
    expect(await db.poll.count()).toBe(0);
    expect(await db.pollResponse.count()).toBe(0);
  });

  it("won't delete someone else's poll", async () => {
    const poll = await createChoicePoll((await createUser()).id);
    auth.mockResolvedValue({ user: { id: (await createUser()).id, name: "Intruder" } });
    expect(await deletePollAction(poll.id)).toMatchObject({ code: "NOT_FOUND" });
    expect(await db.poll.count()).toBe(1);
  });
});
