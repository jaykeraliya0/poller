import { describe, expect, it } from "vitest";
import { dayKey, formatRelative, formatShortSlot, formatSlotLabel, isValidTimeZone, zonedDateTime } from "./datetime";

describe("datetime helpers", () => {
  it("validates IANA time zones", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });

  it("formats the same instant in the poll's time zone", () => {
    const start = new Date("2026-09-25T17:00:00Z");
    expect(formatShortSlot(start, "Europe/London")).toBe("Fri 6pm");
    expect(formatShortSlot(start, "America/New_York")).toBe("Fri 1pm");
  });

  it("keeps minutes for half-hour offsets", () => {
    expect(formatShortSlot(new Date("2026-09-25T12:00:00Z"), "Asia/Kolkata")).toBe("Fri 5:30pm");
  });

  it("puts the day key in the poll's zone, not UTC", () => {
    const lateUtc = new Date("2026-09-26T23:30:00Z");
    expect(dayKey(lateUtc, "UTC")).toBe("2026-09-26");
    expect(dayKey(lateUtc, "Asia/Tokyo")).toBe("2026-09-27");
  });

  it("includes both dates when a slot spans midnight", () => {
    const label = formatSlotLabel(
      new Date("2026-09-26T22:00:00Z"),
      new Date("2026-09-27T01:00:00Z"),
      "UTC",
    );
    expect(label).toBe("Sat 26 Sep, 10pm – Sun 27 Sep, 1am");
  });
});

describe("zonedDateTime", () => {
  it("interprets wall-clock time in the given zone", () => {
    expect(zonedDateTime("2026-09-25", "18:00", "Europe/London")?.toISOString()).toBe("2026-09-25T17:00:00.000Z");
    expect(zonedDateTime("2026-09-25", "18:00", "Asia/Kolkata")?.toISOString()).toBe("2026-09-25T12:30:00.000Z");
    expect(zonedDateTime("2026-12-25", "18:00", "Europe/London")?.toISOString()).toBe("2026-12-25T18:00:00.000Z");
  });

  it("returns null for malformed input", () => {
    expect(zonedDateTime("", "18:00", "UTC")).toBeNull();
    expect(zonedDateTime("2026-09-25", "6pm", "UTC")).toBeNull();
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  it("says 'just now' within a minute either way", () => {
    expect(formatRelative(new Date("2026-09-22T11:59:30Z"), now)).toBe("just now");
    expect(formatRelative(new Date("2026-09-22T12:00:20Z"), now)).toBe("just now");
  });
  it("falls back to a relative distance", () => {
    expect(formatRelative(new Date("2026-09-22T11:55:00Z"), now)).toBe("5 minutes ago");
    expect(formatRelative(new Date("2026-09-24T12:00:00Z"), now)).toBe("in 2 days");
  });
});
