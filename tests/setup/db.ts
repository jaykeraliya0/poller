import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { createSlug } from "@/lib/poll/slug";

/** Wipes every table between tests. Order-independent thanks to CASCADE. */
export async function resetDatabase() {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "answers", "responses", "poll_options", "poll_invites", "poll_groups", "group_members", "groups", "polls", "users" RESTART IDENTITY CASCADE',
  );
}

let seq = 0;

export async function createUser(name = "Test User") {
  seq += 1;
  return db.user.create({
    data: { email: `user${seq}-${Date.now()}@example.com`, name, passwordHash: "not-a-real-hash" },
  });
}

export async function createChoicePoll(
  creatorId: string,
  labels = ["A", "B", "C"],
  overrides: Partial<Prisma.PollUncheckedCreateInput> = {},
) {
  return db.poll.create({
    data: {
      creatorId,
      slug: createSlug(),
      type: "CHOICE",
      title: "Test poll",
      config: { multi: false, maxSelections: null },
      options: { create: labels.map((label, position) => ({ label, position })) },
      ...overrides,
    },
    include: { options: { orderBy: { position: "asc" } } },
  });
}

export async function createAvailabilityPoll(creatorId: string, slotCount = 2) {
  const start = Date.now() + 3 * 24 * 60 * 60 * 1000;
  return db.poll.create({
    data: {
      creatorId,
      slug: createSlug(),
      type: "AVAILABILITY",
      title: "When?",
      config: { timezone: "UTC" },
      options: {
        create: Array.from({ length: slotCount }, (_, position) => ({
          label: `Slot ${position + 1}`,
          position,
          startsAt: new Date(start + position * 3_600_000),
          endsAt: new Date(start + (position + 1) * 3_600_000),
        })),
      },
    },
    include: { options: { orderBy: { position: "asc" } } },
  });
}
