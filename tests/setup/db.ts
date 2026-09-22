import { db } from "@/lib/db";
import { createSlug } from "@/lib/poll/slug";

/** Wipes every table between tests. Order-independent thanks to CASCADE. */
export async function resetDatabase() {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "answers", "responses", "poll_options", "polls", "users" RESTART IDENTITY CASCADE',
  );
}

let seq = 0;

export async function createUser(name = "Test User") {
  seq += 1;
  return db.user.create({
    data: { email: `user${seq}-${Date.now()}@example.com`, name, passwordHash: "not-a-real-hash" },
  });
}

export async function createChoicePoll(creatorId: string, labels = ["A", "B", "C"]) {
  return db.poll.create({
    data: {
      creatorId,
      slug: createSlug(),
      type: "CHOICE",
      title: "Test poll",
      config: { multi: false, maxSelections: null },
      options: { create: labels.map((label, position) => ({ label, position })) },
    },
    include: { options: { orderBy: { position: "asc" } } },
  });
}
