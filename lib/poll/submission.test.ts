import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parsePollSubmission, type PollSubmission } from "./submission";

const settings: PollSubmission["settings"] = {
  closesAt: null,
  allowVoteChange: true,
  isAnonymous: false,
  requireLogin: false,
  resultsVisibility: "PUBLIC",
  expectedParticipants: null,
};

const choice = (overrides: Partial<PollSubmission> = {}): PollSubmission => ({
  template: "CUSTOM",
  type: "CHOICE",
  title: "Lunch spot?",
  description: "",
  config: { multi: false, maxSelections: null },
  options: [{ label: "Pizza" }, { label: "Sushi" }],
  settings,
  ...overrides,
});

describe("parsePollSubmission", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("returns a ready-to-insert poll for valid input", () => {
    const result = parsePollSubmission(choice({ settings: { ...settings, expectedParticipants: 8 } }));
    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({
        title: "Lunch spot?",
        description: undefined,
        type: "CHOICE",
        config: { multi: false, maxSelections: null },
        options: [
          { label: "Pizza", position: 0, startsAt: null, endsAt: null },
          { label: "Sushi", position: 1, startsAt: null, endsAt: null },
        ],
        settings: expect.objectContaining({ expectedParticipants: 8 }),
      }),
    });
  });

  it("collects errors from every part at once, keyed by field path", () => {
    const result = parsePollSubmission(
      choice({
        title: "x",
        options: [{ label: "Same" }, { label: "same" }],
        settings: { ...settings, closesAt: "2026-09-01T00:00:00Z", expectedParticipants: 0 },
      }),
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.keys(result.fieldErrors).sort()).toEqual([
      "options.1.label",
      "settings.closesAt",
      "settings.expectedParticipants",
      "title",
    ]);
  });

  it("validates type-specific config with its own paths", () => {
    const result = parsePollSubmission(choice({ config: { multi: true, maxSelections: 5 } }));
    expect(!result.success && result.fieldErrors["config.maxSelections"]).toBeTruthy();
  });

  it("rejects unknown poll types", () => {
    const result = parsePollSubmission(choice({ type: "SURVEY" as never }));
    expect(!result.success && result.fieldErrors.type).toBeTruthy();
  });

  it("survives garbage input", () => {
    for (const input of [null, undefined, "poll", 42, { settings: "nope" }]) {
      expect(parsePollSubmission(input).success).toBe(false);
    }
  });
});
