import { beforeEach, describe, expect, it } from "vitest";
import { registerUser, verifyCredentials } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { resetDatabase } from "@/tests/setup/db";

const valid = { name: "Ana Lima", email: "Ana@Example.com ", password: "correct horse" };

describe("registerUser", () => {
  beforeEach(resetDatabase);

  it("creates a user with a normalised email and an argon2id hash", async () => {
    const user = await registerUser(valid);
    expect(user).toMatchObject({ name: "Ana Lima", email: "ana@example.com" });

    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored.passwordHash).not.toContain(valid.password);
  });

  it("returns field errors for invalid input", async () => {
    const error = await registerUser({ name: "", email: "nope", password: "short" }).catch((e) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("VALIDATION");
    expect(Object.keys(error.fieldErrors).sort()).toEqual(["email", "name", "password"]);
  });

  it("rejects a duplicate email regardless of case", async () => {
    await registerUser(valid);
    const error = await registerUser({ ...valid, email: "ANA@example.com" }).catch((e) => e);
    expect(error.fieldErrors).toEqual({ email: ["An account with this email already exists"] });
  });
});

describe("verifyCredentials", () => {
  beforeEach(async () => {
    await resetDatabase();
    await registerUser(valid);
  });

  it("returns the user for correct credentials, case-insensitively", async () => {
    const user = await verifyCredentials({ email: "ANA@example.com", password: valid.password });
    expect(user).toMatchObject({ email: "ana@example.com", name: "Ana Lima" });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const wrongPassword = await verifyCredentials({ email: valid.email, password: "wrong password" });
    const unknownEmail = await verifyCredentials({ email: "nobody@example.com", password: "whatever1" });
    expect(wrongPassword).toBeNull();
    expect(unknownEmail).toBeNull();
  });

  it("returns null for malformed input", async () => {
    expect(await verifyCredentials({ email: "not-an-email" })).toBeNull();
    expect(await verifyCredentials(undefined)).toBeNull();
  });
});
