import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csv", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("Barcelona")).toBe("Barcelona");
    expect(csvCell("")).toBe("");
  });

  it("quotes values with commas, quotes or newlines", () => {
    expect(csvCell("Lisbon, Portugal")).toBe('"Lisbon, Portugal"');
    expect(csvCell('The "best" one')).toBe('"The ""best"" one"');
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
  });

  it.each(["=HYPERLINK(\"http://evil\")", "+1+1", "-2", "@SUM(A1)", "\tTab"])(
    "neutralises formula injection in %j",
    (value) => {
      expect(csvCell(value).replace(/^"/, "").startsWith("'")).toBe(true);
    },
  );

  it("joins rows with CRLF", () => {
    expect(toCsv([["a", "b"], ["c", "d,e"]])).toBe('a,b\r\nc,"d,e"\r\n');
  });
});
