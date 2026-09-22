import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "argon2";
import { PrismaClient } from "../generated/prisma/client";
import { createSlug } from "../lib/poll/slug";
import { availabilityPollType } from "../poll-types/availability/definition";
import { choicePollType } from "../poll-types/choice/definition";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const DEMO_EMAIL = "demo@poller.dev";
const DEMO_PASSWORD = "password123";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** Next occurrence of a weekday (0 = Sun) at a UTC hour, at least a few days out. */
function upcoming(weekday: number, utcHour: number): Date {
  const date = new Date(Date.now() + 3 * DAY);
  date.setUTCHours(utcHour, 0, 0, 0);
  while (date.getUTCDay() !== weekday) date.setTime(date.getTime() + DAY);
  return date;
}

const voters = ["Ana", "Ben", "Chloe", "Dev", "Emma", "Farid", "Grace"];

async function seedChoicePoll(creatorId: string) {
  const setup = choicePollType.setupSchema.parse({
    config: { multi: true, maxSelections: 2 },
    options: ["Intro to TypeScript generics", "Testing React apps", "Postgres performance", "Accessibility basics"].map(
      (label) => ({ label }),
    ),
  });

  const poll = await db.poll.create({
    data: {
      creatorId,
      slug: createSlug(),
      type: "CHOICE",
      template: "WORKSHOP_TOPIC",
      title: "Which workshop should we run next month?",
      description: "Pick up to two topics you'd attend.",
      config: setup.config,
      expectedParticipants: 10,
      closesAt: new Date(Date.now() + 5 * DAY),
      options: { create: setup.options },
    },
    include: { options: { orderBy: { position: "asc" } } },
  });

  const picks = [[1, 2], [1], [0, 1], [2, 3], [1, 3], [1], [0]];
  const comments: Record<number, string> = {
    0: "Testing would help the whole team.",
    3: "Would love a Postgres deep dive!",
  };
  for (const [i, optionIndexes] of picks.entries()) {
    await db.pollResponse.create({
      data: {
        pollId: poll.id,
        voterToken: `seed-choice-${i}`,
        voterName: voters[i],
        comment: comments[i],
        createdAt: new Date(Date.now() - (picks.length - i) * 6 * HOUR),
        answers: { create: optionIndexes.map((index) => ({ optionId: poll.options[index].id, value: 1 })) },
      },
    });
  }
  return poll;
}

async function seedAvailabilityPoll(creatorId: string) {
  const friday = upcoming(5, 17);
  const saturday = upcoming(6, 11);
  const setup = availabilityPollType.setupSchema.parse({
    config: { timezone: "Europe/London" },
    options: [
      { startsAt: friday, endsAt: new Date(friday.getTime() + 2 * HOUR) },
      { startsAt: new Date(friday.getTime() + 2 * HOUR), endsAt: new Date(friday.getTime() + 4 * HOUR) },
      { startsAt: saturday, endsAt: new Date(saturday.getTime() + 2 * HOUR) },
      { startsAt: new Date(saturday.getTime() + 6 * HOUR), endsAt: new Date(saturday.getTime() + 8 * HOUR) },
    ],
  });

  const poll = await db.poll.create({
    data: {
      creatorId,
      slug: createSlug(),
      type: "AVAILABILITY",
      template: "EVENT_DATE",
      title: "Team dinner: when works?",
      description: "Mark every slot you could make.",
      config: setup.config,
      expectedParticipants: 8,
      options: { create: setup.options },
    },
    include: { options: { orderBy: { position: "asc" } } },
  });

  // 2 = yes, 1 = if need be, 0 = no, per slot.
  const grid = [
    [2, 1, 0, 2],
    [2, 2, 1, 0],
    [2, 0, 2, 1],
    [1, 2, 2, 0],
    [2, 1, 0, 0],
    [2, 0, 1, 2],
  ];
  for (const [i, values] of grid.entries()) {
    await db.pollResponse.create({
      data: {
        pollId: poll.id,
        voterToken: `seed-availability-${i}`,
        voterName: voters[i],
        comment: i === 2 ? "Saturday lunch is easier with kids." : undefined,
        answers: { create: values.map((value, index) => ({ optionId: poll.options[index].id, value })) },
      },
    });
  }
  return poll;
}

async function main() {
  // Idempotent: removing the demo user cascades to their polls.
  await db.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const demo = await db.user.create({
    data: { email: DEMO_EMAIL, name: "Demo Organiser", passwordHash: await hash(DEMO_PASSWORD) },
  });

  const polls = [await seedChoicePoll(demo.id), await seedAvailabilityPoll(demo.id)];

  console.log(`Seeded ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  for (const poll of polls) console.log(`  /p/${poll.slug}  ${poll.title}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
