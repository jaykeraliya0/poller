import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["/polls/new", "/polls/new"],
    ["/polls/abc/manage?created=1", "/polls/abc/manage?created=1"],
    ["/p/abc#results", "/p/abc#results"],
  ])("keeps same-origin path %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each([
    ["https://evil.example/phish"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["javascript:alert(1)"],
    ["dashboard"],
    [""],
    [undefined],
    [["/a", "/b"]],
  ])("falls back for unsafe value %j", (input) => {
    expect(safeRedirectPath(input)).toBe("/dashboard");
  });

  it("uses a custom fallback", () => {
    expect(safeRedirectPath(null, "/")).toBe("/");
  });
});
