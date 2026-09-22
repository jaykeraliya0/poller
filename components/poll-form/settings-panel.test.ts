import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS_DRAFT, settingsToSubmission } from "./settings-panel";

describe("settingsToSubmission", () => {
  it("sends no deadline unless one is switched on", () => {
    expect(settingsToSubmission({ ...DEFAULT_SETTINGS_DRAFT, closesAt: "2026-10-01T10:00" }).closesAt).toBeNull();
  });

  it("converts a local datetime to an ISO instant", () => {
    const closesAt = settingsToSubmission({ ...DEFAULT_SETTINGS_DRAFT, hasDeadline: true, closesAt: "2026-10-01T10:00" }).closesAt;
    expect(closesAt).toBe(new Date("2026-10-01T10:00").toISOString());
  });

  it("passes an empty string for a missing deadline so validation flags the field", () => {
    expect(settingsToSubmission({ ...DEFAULT_SETTINGS_DRAFT, hasDeadline: true }).closesAt).toBe("");
  });

  it("parses expected participants, keeping bad input for validation", () => {
    expect(settingsToSubmission({ ...DEFAULT_SETTINGS_DRAFT, expectedParticipants: " " }).expectedParticipants).toBeNull();
    expect(settingsToSubmission({ ...DEFAULT_SETTINGS_DRAFT, expectedParticipants: "12" }).expectedParticipants).toBe(12);
    expect(settingsToSubmission({ ...DEFAULT_SETTINGS_DRAFT, expectedParticipants: "2.5" }).expectedParticipants).toBe(2.5);
  });

  it("sends the chosen audience", () => {
    expect(settingsToSubmission(DEFAULT_SETTINGS_DRAFT).visibility).toBe("PUBLIC");
    expect(settingsToSubmission({ ...DEFAULT_SETTINGS_DRAFT, visibility: "PRIVATE" }).visibility).toBe("PRIVATE");
  });
});
