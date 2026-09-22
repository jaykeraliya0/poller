import { describe, expect, it } from "vitest";
import { parseEmailList } from "./emails";

describe("parseEmailList", () => {
  it("splits on commas, semicolons, spaces and new lines", () => {
    expect(parseEmailList("a@x.com, b@x.com;c@x.com\nd@x.com  e@x.com")).toEqual({
      success: true,
      emails: ["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com"],
    });
  });

  it("lowercases and dedupes", () => {
    expect(parseEmailList("Ann@X.com ann@x.com <ann@x.com>")).toEqual({ success: true, emails: ["ann@x.com"] });
  });

  it("rejects the whole list when any entry is invalid", () => {
    const result = parseEmailList("ok@x.com nope bad@");
    expect(result).toEqual({ success: false, error: "Not valid emails: nope, bad@" });
  });

  it("rejects empty input and non-strings", () => {
    expect(parseEmailList("  ,\n ").success).toBe(false);
    expect(parseEmailList(undefined).success).toBe(false);
  });

  it("caps the number of addresses", () => {
    const list = Array.from({ length: 4 }, (_, i) => `u${i}@x.com`).join(" ");
    expect(parseEmailList(list, 3)).toEqual({ success: false, error: "Add up to 3 addresses at a time" });
  });
});
