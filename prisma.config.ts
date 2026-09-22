import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
    // Pre-created shadow DB: CREATE DATABASE from template1 can fail on
    // hosts with a collation version mismatch.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
