import { afterEach, vi } from "vitest";
import "dotenv/config";

// Integration tests always run against the dedicated test database.
if (!process.env.DATABASE_URL_TEST) {
  throw new Error("DATABASE_URL_TEST must be set to run integration tests");
}
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

// `after()` needs a request scope, which tests don't have: run deferred emails inline instead.
vi.mock("@/lib/email/defer", async () => {
  const { deferEmailNow } = await import("./email");
  return { deferEmail: deferEmailNow };
});

// Let each test's emails finish before the next one resets the database.
afterEach(async () => {
  const { flushEmails } = await import("./email");
  await flushEmails();
});
