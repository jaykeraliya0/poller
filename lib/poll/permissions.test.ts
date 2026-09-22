import { describe, expect, it } from "vitest";
import type { ResultsVisibility } from "@/generated/prisma/enums";
import {
  canManage,
  canSeeVoterNames,
  canViewResults,
  canViewVotePage,
  canVote,
  canWithdrawVote,
  type PollRules,
  type Viewer,
} from "./permissions";

const now = new Date("2026-09-22T12:00:00Z");
const past = new Date("2026-09-21T12:00:00Z");

const rules = (overrides: Partial<PollRules> = {}): PollRules => ({
  closesAt: null,
  closedAt: null,
  allowVoteChange: true,
  isAnonymous: false,
  requireLogin: false,
  resultsVisibility: "PUBLIC",
  ...overrides,
});

const guest: Viewer = { userId: null, isOwner: false, hasVoted: false };
const member: Viewer = { userId: "u1", isOwner: false, hasVoted: false };
const owner: Viewer = { userId: "owner", isOwner: true, hasVoted: false };
const voted = (viewer: Viewer): Viewer => ({ ...viewer, hasVoted: true });

describe("vote page access", () => {
  it("lets guests in unless the poll requires login", () => {
    expect(canViewVotePage(rules(), guest).allowed).toBe(true);
    expect(canViewVotePage(rules({ requireLogin: true }), guest)).toEqual({
      allowed: false,
      reason: "LOGIN_REQUIRED",
    });
    expect(canViewVotePage(rules({ requireLogin: true }), member).allowed).toBe(true);
  });
});

describe("canVote", () => {
  it.each([
    ["guest", guest],
    ["signed-in voter", member],
    ["owner (counts like anyone)", owner],
  ])("allows a %s on an open poll", (_, viewer) => {
    expect(canVote(rules(), viewer, now).allowed).toBe(true);
  });

  it("rejects everyone once the poll is closed", () => {
    for (const viewer of [guest, member, owner]) {
      expect(canVote(rules({ closedAt: past }), viewer, now)).toEqual({
        allowed: false,
        reason: "POLL_CLOSED",
      });
      expect(canVote(rules({ closesAt: past }), viewer, now).allowed).toBe(false);
    }
  });

  it("requires sign-in when require_login is on", () => {
    expect(canVote(rules({ requireLogin: true }), guest, now)).toEqual({
      allowed: false,
      reason: "LOGIN_REQUIRED",
    });
    expect(canVote(rules({ requireLogin: true }), member, now).allowed).toBe(true);
  });

  it("allows a changed vote only when vote changes are allowed", () => {
    expect(canVote(rules(), voted(guest), now).allowed).toBe(true);
    expect(canVote(rules({ allowVoteChange: false }), voted(guest), now)).toEqual({
      allowed: false,
      reason: "ALREADY_VOTED",
    });
  });

  it("reports closed before other reasons", () => {
    const poll = rules({ closedAt: past, requireLogin: true, allowVoteChange: false });
    expect(canVote(poll, voted(guest), now)).toMatchObject({ reason: "POLL_CLOSED" });
  });
});

describe("canWithdrawVote", () => {
  it("requires an existing vote, an open poll and vote changes enabled", () => {
    expect(canWithdrawVote(rules(), guest, now)).toMatchObject({ reason: "NOT_FOUND" });
    expect(canWithdrawVote(rules(), voted(guest), now).allowed).toBe(true);
    expect(canWithdrawVote(rules({ closedAt: past }), voted(guest), now)).toMatchObject({
      reason: "POLL_CLOSED",
    });
    expect(canWithdrawVote(rules({ allowVoteChange: false }), voted(member), now)).toMatchObject({
      reason: "VOTE_CHANGE_DISABLED",
    });
  });
});

describe("canViewResults", () => {
  const cases: [ResultsVisibility, { open: boolean; voted: boolean }, boolean][] = [
    ["PUBLIC", { open: true, voted: false }, true],
    ["AFTER_VOTE", { open: true, voted: false }, false],
    ["AFTER_VOTE", { open: true, voted: true }, true],
    ["AFTER_VOTE", { open: false, voted: false }, true],
    ["AFTER_CLOSE", { open: true, voted: true }, false],
    ["AFTER_CLOSE", { open: false, voted: false }, true],
    ["OWNER_ONLY", { open: false, voted: true }, false],
  ];

  it.each(cases)("%s with %o → %s for a voter", (visibility, state, expected) => {
    const poll = rules({ resultsVisibility: visibility, closedAt: state.open ? null : past });
    const viewer = { ...member, hasVoted: state.voted };
    expect(canViewResults(poll, viewer, now).allowed).toBe(expected);
  });

  it("always lets the owner see results", () => {
    for (const visibility of ["PUBLIC", "AFTER_VOTE", "AFTER_CLOSE", "OWNER_ONLY"] as const) {
      expect(canViewResults(rules({ resultsVisibility: visibility }), owner, now).allowed).toBe(true);
    }
  });

  it("explains why results are hidden", () => {
    expect(canViewResults(rules({ resultsVisibility: "AFTER_CLOSE" }), guest, now)).toEqual({
      allowed: false,
      reason: "AFTER_CLOSE",
    });
  });
});

describe("voter names and management", () => {
  it("shows names only on named polls with visible results", () => {
    expect(canSeeVoterNames(rules(), guest, now)).toBe(true);
    expect(canSeeVoterNames(rules({ isAnonymous: true }), owner, now)).toBe(false);
    expect(canSeeVoterNames(rules({ resultsVisibility: "OWNER_ONLY" }), member, now)).toBe(false);
    expect(canSeeVoterNames(rules({ resultsVisibility: "OWNER_ONLY" }), owner, now)).toBe(true);
  });

  it("restricts management to the owner", () => {
    expect(canManage(owner)).toBe(true);
    expect(canManage(member)).toBe(false);
    expect(canManage(guest)).toBe(false);
  });
});
