import { describe, expect, it } from "vitest";
import { dayKey, formatShortSlot, formatSlotLabel, isValidTimeZone } from "./datetime";

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
