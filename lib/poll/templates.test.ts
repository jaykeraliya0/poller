import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPollType, isSupportedPollType } from "@/poll-types/registry";
import { POLL_TEMPLATES, getTemplate } from "./templates";

describe("poll templates", () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date("2026-09-22T12:00:00Z") }));
  afterEach(() => vi.useRealTimers());

  it("covers every template id exactly once", () => {
    const ids = POLL_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(["EVENT_DATE", "FEATURE_PRIORITY", "OFFSITE_LOCATION", "WORKSHOP_TOPIC", "CUSTOM"]));
  });

  it.each(POLL_TEMPLATES.filter((t) => t.optionLabels.some(Boolean)))(
    "$id uses a supported type and its starter content is valid",
    (template) => {
      expect(isSupportedPollType(template.type)).toBe(true);
      const setup = getPollType(template.type).setupSchema.safeParse({
        config: template.config,
        options: template.optionLabels.map((label) => ({ label })),
      });
      expect(setup.success).toBe(true);
    },
  );

  it("looks templates up by id and rejects unknown ones", () => {
    expect(getTemplate("EVENT_DATE")?.type).toBe("AVAILABILITY");
    expect(getTemplate("NOPE")).toBeNull();
    expect(getTemplate(undefined)).toBeNull();
  });
});
