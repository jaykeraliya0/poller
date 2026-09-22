import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPollAction } from "@/actions/polls";
import { db } from "@/lib/db";
import type { PollSubmission } from "@/lib/poll/submission";
import { createUser, resetDatabase } from "@/tests/setup/db";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const DAY = 24 * 60 * 60 * 1000;
const inDays = (days: number, hourUtc = 17) => {
  const date = new Date(Date.now() + days * DAY);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date;
};

const settings: PollSubmission["settings"] = {
  closesAt: null,
  allowVoteChange: true,
  isAnonymous: false,
  requireLogin: false,
  resultsVisibility: "PUBLIC",
  expectedParticipants: null,
};

const choiceSubmission: PollSubmission = {
  template: "WORKSHOP_TOPIC",
  type: "CHOICE",
  title: "  Which workshop?  ",
  description: "Pick two",
  config: { multi: true, maxSelections: 2 },
  options: [{ label: "Testing" }, { label: "Postgres" }, { label: "A11y" }],
  settings: { ...settings, expectedParticipants: 10 },
};

/** Runs the action and returns the redirect target, or the failure it returned. */
async function submit(input: unknown) {
  try {
    return { failure: await createPollAction(input) };
  } catch (error) {
    const digest = String((error as { digest?: string }).digest ?? "");
    if (!digest.startsWith("NEXT_REDIRECT")) throw error;
    return { redirectTo: digest.split(";")[2] };
  }
}

describe("createPollAction", () => {
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();
    userId = (await createUser()).id;
    auth.mockResolvedValue({ user: { id: userId, name: "Owner" } });
  });

  it("creates a choice poll with ordered options and redirects to its manage page", async () => {
    const { redirectTo } = await submit(choiceSubmission);
    const poll = await db.poll.findFirstOrThrow({
      where: { creatorId: userId },
      include: { options: { orderBy: { position: "asc" } } },
    });

    expect(redirectTo).toBe(`/polls/${poll.id}/manage?created=1`);
    expect(poll).toMatchObject({
      title: "Which workshop?",
      template: "WORKSHOP_TOPIC",
      config: { multi: true, maxSelections: 2 },
      expectedParticipants: 10,
      closedAt: null,
    });
    expect(poll.slug).toMatch(/^[2-9a-z]{10}$/);
    expect(poll.options.map((option) => option.label)).toEqual(["Testing", "Postgres", "A11y"]);
  });

  it("creates an availability poll with slots sorted and labelled in its time zone", async () => {
    const later = inDays(4);
    const sooner = inDays(3);
    await submit({
      ...choiceSubmission,
      template: "EVENT_DATE",
      type: "AVAILABILITY",
      config: { timezone: "UTC" },
      options: [
        { startsAt: later.toISOString(), endsAt: new Date(later.getTime() + 3_600_000).toISOString() },
        { startsAt: sooner.toISOString(), endsAt: new Date(sooner.getTime() + 3_600_000).toISOString() },
      ],
    });

    const options = await db.pollOption.findMany({ orderBy: { position: "asc" } });
    expect(options.map((option) => option.startsAt)).toEqual([sooner, later]);
    expect(options[0].label).toMatch(/5pm – 6pm$/);
  });

  it("returns field errors and writes nothing for invalid input", async () => {
    const { failure } = await submit({ ...choiceSubmission, title: "", options: [{ label: "Only one" }] });
    expect(failure).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(Object.keys(failure!.fieldErrors!)).toEqual(expect.arrayContaining(["title", "options"]));
    expect(await db.poll.count()).toBe(0);
  });

  it("requires a signed-in user", async () => {
    auth.mockResolvedValue(null);
    const { failure } = await submit(choiceSubmission);
    expect(failure).toMatchObject({ code: "UNAUTHENTICATED" });
    expect(await db.poll.count()).toBe(0);
  });

  it("rate limits poll creation to 10 per hour per user", async () => {
    for (let i = 0; i < 10; i++) expect((await submit(choiceSubmission)).redirectTo).toBeDefined();
    const { failure } = await submit(choiceSubmission);
    expect(failure).toMatchObject({ code: "RATE_LIMITED", retryAfter: expect.any(Number) });
    expect(await db.poll.count()).toBe(10);
  });
});
