import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError, fail, toActionFailure, toFieldErrors } from "./errors";

describe("toFieldErrors", () => {
  it("keys messages by dotted path, with root issues under _form", () => {
    const schema = z
      .object({ options: z.array(z.object({ label: z.string().min(1, "Required") })) })
      .refine(() => false, { error: "Whole form invalid" });
    const result = schema.safeParse({ options: [{ label: "ok" }, { label: "" }] });
    expect(toFieldErrors(result.error!)).toEqual({
      "options.1.label": ["Required"],
      _form: ["Whole form invalid"],
    });

    const rootOnly = schema.safeParse({ options: [] });
    expect(toFieldErrors(rootOnly.error!)).toEqual({ _form: ["Whole form invalid"] });
  });
});

describe("toActionFailure", () => {
  afterEach(() => vi.restoreAllMocks());

  it("preserves AppError details", () => {
    const error = new AppError("RATE_LIMITED", undefined, { retryAfter: 30 });
    expect(toActionFailure(error)).toEqual(fail("RATE_LIMITED", undefined, { retryAfter: 30 }));
  });

  it("maps zod errors to VALIDATION with field errors", () => {
    const result = z.object({ title: z.string() }).safeParse({});
    expect(toActionFailure(result.error)).toMatchObject({
      ok: false,
      code: "VALIDATION",
      fieldErrors: { title: [expect.any(String)] },
    });
  });

  it("hides unexpected errors behind INTERNAL and logs them", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(toActionFailure(new Error("db exploded"))).toEqual({
      ok: false,
      code: "INTERNAL",
      message: "Something went wrong. Please try again.",
    });
    expect(log).toHaveBeenCalled();
  });
});
