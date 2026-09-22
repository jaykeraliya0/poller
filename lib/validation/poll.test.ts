import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_POLL_SETTINGS, pollDetailsSchema, pollSettingsSchema } from "./poll";

describe("pollDetailsSchema", () => {
  it("trims the title and turns an empty description into undefined", () => {
    const result = pollDetailsSchema.parse({ title: "  Team lunch  ", description: "   ", type: "CHOICE" });
    expect(result).toEqual({ title: "Team lunch", description: undefined, type: "CHOICE", template: "CUSTOM" });
  });

  it("rejects short or overlong titles and unknown types", () => {
    expect(pollDetailsSchema.safeParse({ title: "Hi", type: "CHOICE" }).success).toBe(false);
    expect(pollDetailsSchema.safeParse({ title: "x".repeat(121), type: "CHOICE" }).success).toBe(false);
    expect(pollDetailsSchema.safeParse({ title: "Lunch", type: "SURVEY" }).success).toBe(false);
  });
});

describe("pollSettingsSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("accepts the defaults", () => {
    expect(pollSettingsSchema.parse(DEFAULT_POLL_SETTINGS)).toEqual(DEFAULT_POLL_SETTINGS);
  });

  it("accepts a future deadline sent as an ISO string", () => {
    const result = pollSettingsSchema.parse({ ...DEFAULT_POLL_SETTINGS, closesAt: "2026-09-23T12:00:00Z" });
    expect(result.closesAt).toEqual(new Date("2026-09-23T12:00:00Z"));
  });

  it("rejects past or invalid deadlines", () => {
    const past = pollSettingsSchema.safeParse({ ...DEFAULT_POLL_SETTINGS, closesAt: "2026-09-22T11:00:00Z" });
    expect(past.error?.issues[0].message).toBe("Deadline must be in the future");
    expect(pollSettingsSchema.safeParse({ ...DEFAULT_POLL_SETTINGS, closesAt: "not a date" }).success).toBe(false);
  });

  it("requires a positive whole number of expected participants", () => {
    for (const value of [0, -3, 2.5, 10_001]) {
      expect(pollSettingsSchema.safeParse({ ...DEFAULT_POLL_SETTINGS, expectedParticipants: value }).success).toBe(false);
    }
    expect(pollSettingsSchema.safeParse({ ...DEFAULT_POLL_SETTINGS, expectedParticipants: 12 }).success).toBe(true);
  });
});
