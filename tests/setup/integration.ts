import "dotenv/config";

// Integration tests always run against the dedicated test database.
if (!process.env.DATABASE_URL_TEST) {
  throw new Error("DATABASE_URL_TEST must be set to run integration tests");
}
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
