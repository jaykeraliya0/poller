import { beforeEach, describe, expect, it, vi } from "vitest";
import { archivePollAction, bulkPollAction, reopenPollAction, unarchivePollAction } from "@/actions/polls";
import { GET as exportPoll } from "@/app/api/polls/[id]/export/route";
import { db } from "@/lib/db";
import { listPollsForOwner, listPollsSharedWith } from "@/lib/poll/service";
import { castVote } from "@/lib/poll/votes";
import { createChoicePoll, createUser, resetDatabase } from "@/tests/setup/db";
import { flushEmails } from "@/tests/setup/email";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const HOUR = 3_600_000;
const signInAs = (id: string) => auth.mockResolvedValue({ user: { id, name: "Someone" }, authAt: Date.now() });
const list = (ownerId: string, filter: "all" | "open" | "closed" | "archived") =>
  listPollsForOwner(ownerId, { scope: "mine", filter, q: "", page: 1 });
const titles = async (ownerId: string, filter: "all" | "open" | "closed" | "archived") =>
  (await list(ownerId, filter)).polls.map((poll) => poll.title).sort();
const guestVote = (poll: Awaited<ReturnType<typeof createChoicePoll>>, optionIndex: number, name: string) =>
  castVote(
    { slug: poll.slug, answers: { optionIds: [poll.options[optionIndex].id] }, voterName: name, comment: `${name} says hi` },
    { userId: null, userName: null, userEmail: null, userEmailVerified: false, voterToken: crypto.randomUUID() },
  );

type User = Awaited<ReturnType<typeof createUser>>;

beforeEach(async () => {
  await resetDatabase();
  await flushEmails();
  auth.mockReset();
});

describe("archiving", () => {
  let owner: User;

  beforeEach(async () => {
    owner = await createUser("Owner");
    signInAs(owner.id);
  });

  it("closes an open poll, skips the results email and moves it to the archived list", async () => {
    const poll = await createChoicePoll(owner.id, ["A", "B"], { title: "Lunch" });
    await createChoicePoll(owner.id, ["A", "B"], { title: "Dinner" });

    await expect(archivePollAction(poll.id)).resolves.toEqual({ ok: true, data: undefined });
    const stored = await db.poll.findUniqueOrThrow({ where: { id: poll.id } });
    expect(stored).toMatchObject({ archivedAt: expect.any(Date), closedAt: expect.any(Date), resultsEmailedAt: expect.any(Date) });
    expect(await flushEmails()).toEqual([]);

    expect(await titles(owner.id, "all")).toEqual(["Dinner"]);
    expect(await titles(owner.id, "closed")).toEqual([]);
    expect(await titles(owner.id, "archived")).toEqual(["Lunch"]);
    expect((await list(owner.id, "all")).counts).toEqual({ all: 1, open: 1, closed: 0, archived: 1 });
  });

  it("must be undone before reopening; unarchiving leaves the poll closed", async () => {
    const poll = await createChoicePoll(owner.id);
    await archivePollAction(poll.id);
    await expect(reopenPollAction(poll.id)).resolves.toMatchObject({ ok: false, code: "CONFLICT" });

    await unarchivePollAction(poll.id);
    const stored = await db.poll.findUniqueOrThrow({ where: { id: poll.id } });
    expect(stored.archivedAt).toBeNull();
    expect(stored.closedAt).toBeInstanceOf(Date);
    await expect(reopenPollAction(poll.id)).resolves.toMatchObject({ ok: true });
  });

  it("doesn't hide the poll from people it's shared with", async () => {
    const invitee = await createUser("Invitee");
    const poll = await createChoicePoll(owner.id, ["A", "B"], { visibility: "PRIVATE" });
    await db.pollInvite.create({ data: { pollId: poll.id, email: invitee.email } });
    await archivePollAction(poll.id);

    const shared = await listPollsSharedWith(invitee, { scope: "mine", filter: "all", q: "", page: 1 });
    expect(shared.polls.map((item) => item.id)).toEqual([poll.id]);
  });
});

describe("bulk actions", () => {
  let owner: User;

  beforeEach(async () => {
    owner = await createUser("Owner");
    signInAs(owner.id);
  });

  it("close the open ones among the selection and email their results", async () => {
    const open = await createChoicePoll(owner.id, ["A"], { title: "Open" });
    const alreadyClosed = await createChoicePoll(owner.id, ["A"], { title: "Closed", closedAt: new Date(Date.now() - HOUR) });

    await expect(bulkPollAction("close", [open.id, alreadyClosed.id])).resolves.toEqual({ ok: true, data: { count: 1 } });
    expect((await db.poll.findUniqueOrThrow({ where: { id: open.id } })).closedAt).toBeInstanceOf(Date);
    expect((await flushEmails()).map((email) => email.to)).toEqual([owner.email]);
  });

  it("archive, unarchive and delete only the owner's own polls", async () => {
    const mine = await createChoicePoll(owner.id, ["A"], { title: "Mine" });
    const theirs = await createChoicePoll((await createUser("Other")).id, ["A"], { title: "Theirs" });

    await expect(bulkPollAction("archive", [mine.id, theirs.id])).resolves.toEqual({ ok: true, data: { count: 1 } });
    expect((await db.poll.findUniqueOrThrow({ where: { id: theirs.id } })).archivedAt).toBeNull();

    await expect(bulkPollAction("unarchive", [mine.id, theirs.id])).resolves.toEqual({ ok: true, data: { count: 1 } });
    await expect(bulkPollAction("delete", [mine.id, theirs.id])).resolves.toEqual({ ok: true, data: { count: 1 } });
    expect(await db.poll.findMany({ select: { title: true } })).toEqual([{ title: "Theirs" }]);
  });

  it("reject empty, malformed or oversized selections and unknown actions", async () => {
    await expect(bulkPollAction("archive", [])).resolves.toMatchObject({ ok: false, code: "VALIDATION" });
    await expect(bulkPollAction("archive", ["nope"])).resolves.toMatchObject({ ok: false, code: "VALIDATION" });
    const tooMany = Array.from({ length: 101 }, () => crypto.randomUUID());
    await expect(bulkPollAction("archive", tooMany)).resolves.toMatchObject({ ok: false, code: "VALIDATION" });
    const poll = await createChoicePoll(owner.id);
    await expect(bulkPollAction("explode" as never, [poll.id])).resolves.toMatchObject({ ok: false, code: "VALIDATION" });
  });

  it("need a signed-in user", async () => {
    auth.mockResolvedValue(null);
    const poll = await createChoicePoll(owner.id);
    await expect(bulkPollAction("delete", [poll.id])).resolves.toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
    expect(await db.poll.count()).toBe(1);
  });
});

describe("exports", () => {
  let owner: User;
  let poll: Awaited<ReturnType<typeof createChoicePoll>>;
  const download = (format: string | null, id = poll.id) =>
    exportPoll(new Request(`http://test/api/polls/${id}/export${format ? `?format=${format}` : ""}`), {
      params: Promise.resolve({ id }),
    });

  beforeEach(async () => {
    owner = await createUser("Owner");
    poll = await createChoicePoll(owner.id, ["Pizza", "Tacos"], { title: "Lunch" });
    for (const [i, name] of ["Ana", "Ben", "Cy", "Di"].entries()) await guestVote(poll, i === 3 ? 1 : 0, name);
    signInAs(owner.id);
  });

  it("serve every format with a filename per poll", async () => {
    const cases = [
      [null, "responses.csv", "text/csv"],
      ["json", "export.json", "application/json"],
      ["results-pdf", "results.pdf", "application/pdf"],
      ["results-png", "results.png", "image/png"],
      ["analytics-pdf", "analytics.pdf", "application/pdf"],
    ] as const;
    for (const [format, suffix, type] of cases) {
      const response = await download(format);
      expect(response.status, String(format)).toBe(200);
      expect(response.headers.get("content-type")).toContain(type);
      expect(response.headers.get("content-disposition")).toBe(`attachment; filename="poll-${poll.slug}-${suffix}"`);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("render real PDF and PNG files", async () => {
    const bytes = async (format: string) => new Uint8Array(await (await download(format)).arrayBuffer());
    const pdf = await bytes("results-pdf");
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
    expect(new TextDecoder().decode((await bytes("analytics-pdf")).slice(0, 5))).toBe("%PDF-");
    // PNG signature.
    expect([...(await bytes("results-png")).slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it("export JSON with labelled answers and the same insights as the results page", async () => {
    const json = await (await download("json")).json();
    expect(json).toMatchObject({
      format: "poller.poll-export",
      version: 1,
      poll: { id: poll.id, title: "Lunch", type: "CHOICE", status: "OPEN" },
      options: [{ label: "Pizza" }, { label: "Tacos" }],
      insights: { common: { totalResponses: 4 }, byType: { kind: "CHOICE", outcome: { kind: "LEADER" } } },
    });
    expect(json.responses[0]).toMatchObject({
      name: "Ana",
      comment: "Ana says hi",
      answers: [{ option: "Pizza", value: 1, display: "1" }],
    });
    expect(json.responses[0].submittedAt).toEqual(expect.any(String));
  });

  it("keep anonymous polls anonymous in JSON", async () => {
    await db.poll.update({ where: { id: poll.id }, data: { isAnonymous: true } });
    const json = await (await download("json")).json();
    expect(Object.keys(json.responses[0]).sort()).toEqual(["answers", "comment", "id", "submittedOn", "summary"]);
    expect(json.responses[0].submittedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(json.insights.common.comments[0]).toMatchObject({ author: null, at: null });
  });

  it("work for polls with no votes yet", async () => {
    const empty = await createChoicePoll(owner.id, ["A", "B"]);
    for (const format of ["results-pdf", "analytics-pdf", "results-png", "json"]) {
      expect((await download(format, empty.id)).status, format).toBe(200);
    }
  });

  it("refuse unknown formats, and hide the poll from anyone but the owner", async () => {
    expect((await download("docx")).status).toBe(400);
    signInAs((await createUser("Intruder")).id);
    expect((await download("results-pdf")).status).toBe(404);
    auth.mockResolvedValue(null);
    expect((await download("json")).status).toBe(404);
  });
});
