import { describe, expect, it } from "vitest";
import { availabilityEditor } from "./editor";

describe("availabilityEditor.toSubmission", () => {
  it("converts wall-clock slots using the poll's time zone", () => {
    const { options } = availabilityEditor.toSubmission({ timezone: "America/New_York" }, [
      { key: "a", date: "2026-09-25", time: "18:00", durationMin: 90 },
    ]);
    expect(options).toEqual([{ startsAt: "2026-09-25T22:00:00.000Z", endsAt: "2026-09-25T23:30:00.000Z" }]);
  });

  it("keeps the same wall-clock time when the zone changes", () => {
    const slot = { key: "a", date: "2026-09-25", time: "09:00", durationMin: 60 };
    const london = availabilityEditor.toSubmission({ timezone: "Europe/London" }, [slot]).options[0];
    const tokyo = availabilityEditor.toSubmission({ timezone: "Asia/Tokyo" }, [slot]).options[0];
    expect(london).toMatchObject({ startsAt: "2026-09-25T08:00:00.000Z" });
    expect(tokyo).toMatchObject({ startsAt: "2026-09-25T00:00:00.000Z" });
  });

  it("emits empty values for malformed drafts so validation reports them", () => {
    const { options } = availabilityEditor.toSubmission({ timezone: "UTC" }, [
      { key: "a", date: "", time: "18:00", durationMin: 60 },
    ]);
    expect(options).toEqual([{ startsAt: "", endsAt: "" }]);
  });
});
