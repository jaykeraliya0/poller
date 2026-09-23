import { describe, expect, it } from "vitest";
import { POLL_FILTERS, POLL_SCOPES, getPageItems, parsePollListParams, pollListHref } from "./list-params";

describe("parsePollListParams", () => {
  it("defaults to every poll on the first page", () => {
    expect(parsePollListParams({})).toEqual({ scope: "mine", filter: "all", q: "", page: 1 });
  });

  it("reads status, search and page", () => {
    expect(parsePollListParams({ status: "closed", q: "  lunch ", page: "3" })).toEqual({
      scope: "mine",
      filter: "closed",
      q: "lunch",
      page: 3,
    });
  });

  it.each([["0"], ["-2"], ["1.5"], ["abc"], ["1e400"]])("falls back to page 1 for %s", (page) => {
    expect(parsePollListParams({ page }).page).toBe(1);
  });

  it("ignores unknown statuses and takes the first of repeated params", () => {
    expect(parsePollListParams({ status: "deleted", page: ["2", "5"] })).toEqual({ scope: "mine", filter: "all", q: "", page: 2 });
  });

  it("only accepts the filters a list offers", () => {
    expect(parsePollListParams({ status: "archived" }).filter).toBe("archived");
    expect(parsePollListParams({ status: "archived" }, ["all", "open", "closed"]).filter).toBe("all");
  });

  it("caps very long searches", () => {
    expect(parsePollListParams({ q: "x".repeat(500) }).q).toHaveLength(100);
  });

  it("ignores ?scope= on a list that offers no scope switcher", () => {
    expect(parsePollListParams({ scope: "voted" }).scope).toBe("mine");
  });

  it("reads a scope the list does offer", () => {
    expect(parsePollListParams({ scope: "voted" }, POLL_FILTERS, POLL_SCOPES).scope).toBe("voted");
    expect(parsePollListParams({ scope: "nonsense" }, POLL_FILTERS, POLL_SCOPES).scope).toBe("mine");
  });
});

describe("pollListHref", () => {
  it("leaves defaults out of the URL", () => {
    expect(pollListHref({})).toBe("/dashboard");
    expect(pollListHref({ filter: "all", q: " ", page: 1 })).toBe("/dashboard");
  });

  it("leaves the default scope out and names the other one", () => {
    expect(pollListHref({ scope: "mine", filter: "open" })).toBe("/dashboard?status=open");
    expect(pollListHref({ scope: "voted" })).toBe("/dashboard?scope=voted");
  });

  it("round-trips through parsePollListParams", () => {
    const href = pollListHref({ scope: "voted", filter: "open", q: "team & co", page: 4 });
    expect(href).toBe("/dashboard?scope=voted&status=open&q=team+%26+co&page=4");
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(parsePollListParams(params, POLL_FILTERS, POLL_SCOPES)).toEqual({
      scope: "voted",
      filter: "open",
      q: "team & co",
      page: 4,
    });
  });
});

describe("getPageItems", () => {
  it("lists every page when there are only a few", () => {
    expect(getPageItems(1, 1)).toEqual([1]);
    expect(getPageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses long runs into gaps around the current page", () => {
    expect(getPageItems(1, 20)).toEqual([1, 2, "gap", 20]);
    expect(getPageItems(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
    expect(getPageItems(20, 20)).toEqual([1, "gap", 19, 20]);
  });

  it("shows a lone hidden page instead of a gap", () => {
    expect(getPageItems(4, 20)).toEqual([1, 2, 3, 4, 5, "gap", 20]);
  });
});
