import { describe, expect, it } from "vitest";
import { canReopen, getClosedAt, getPollStatus, isPollOpen } from "./status";

const now = new Date("2026-09-22T12:00:00Z");
const hours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000);

describe("poll status", () => {
  it("is open with no deadline and not closed", () => {
    const poll = { closesAt: null, closedAt: null };
    expect(isPollOpen(poll, now)).toBe(true);
    expect(getPollStatus(poll, now)).toBe("OPEN");
  });

  it("is closing soon within 24h of the deadline", () => {
    expect(getPollStatus({ closesAt: hours(23), closedAt: null }, now)).toBe("CLOSING_SOON");
    expect(getPollStatus({ closesAt: hours(25), closedAt: null }, now)).toBe("OPEN");
  });

  it("closes exactly at the deadline", () => {
    const poll = { closesAt: now, closedAt: null };
    expect(isPollOpen(poll, now)).toBe(false);
    expect(getClosedAt(poll, now)).toEqual(now);
  });

  it("is closed when the owner closed it early, even with a future deadline", () => {
    const poll = { closesAt: hours(48), closedAt: hours(-1) };
    expect(getPollStatus(poll, now)).toBe("CLOSED");
    expect(getClosedAt(poll, now)).toEqual(hours(-1));
  });

  it("allows reopening only a manually closed poll whose deadline is ahead", () => {
    expect(canReopen({ closesAt: hours(5), closedAt: hours(-1) }, now)).toBe(true);
    expect(canReopen({ closesAt: null, closedAt: hours(-1) }, now)).toBe(true);
    expect(canReopen({ closesAt: hours(-2), closedAt: hours(-3) }, now)).toBe(false);
    expect(canReopen({ closesAt: hours(-2), closedAt: null }, now)).toBe(false);
  });
});
