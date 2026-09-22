import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// Reuse one client across hot reloads in development. After `prisma generate`
// the client module reloads with a new class; a client from the old one
// wouldn't know the new models or fields, so replace it.
const globalForPrisma = globalThis as unknown as { prisma?: { $disconnect(): Promise<void> } };

const cached = globalForPrisma.prisma;
if (cached && !(cached instanceof PrismaClient)) void cached.$disconnect();

export const db = cached instanceof PrismaClient ? cached : createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
