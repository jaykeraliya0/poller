import { execSync } from "node:child_process";
import "dotenv/config";

/** Brings the test database up to the latest migration once per run. */
export default function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST must be set to run integration tests");
  execSync("pnpm prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url },
  });
}
