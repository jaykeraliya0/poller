import { hash } from "argon2";
import { createSlug } from "../../lib/poll/slug";
import { availabilityPollType } from "../../poll-types/availability/definition";
import { choicePollType } from "../../poll-types/choice/definition";
import { rankingPollType } from "../../poll-types/ranking/definition";
import { ratingPollType } from "../../poll-types/rating/definition";
import { db } from "./db";

export const DEMO_EMAIL = "demo@poller.dev";
export const VOTER_EMAIL = "voter@poller.dev";
export const DEMO_PASSWORD = "password123";

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

async function seedChoicePoll(creatorId: string, voterId: string) {
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
        // The first vote belongs to the signed-in demo voter account.
        userId: i === 0 ? voterId : undefined,
        voterName: i === 0 ? "Sam Voter" : voters[i],
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

async function seedRankingPoll(creatorId: string) {
  const setup = rankingPollType.setupSchema.parse({
    config: { rankTop: 3 },
    options: ["Dark mode", "Offline support", "CSV export", "Faster search"].map((label) => ({ label })),
  });
  const poll = await db.poll.create({
    data: {
      creatorId,
      slug: createSlug(),
      type: "RANKING",
      template: "FEATURE_PRIORITY",
      title: "What should we build next?",
      description: "Rank the three features you think matter most.",
      config: setup.config,
      expectedParticipants: 6,
      options: { create: setup.options },
    },
    include: { options: { orderBy: { position: "asc" } } },
  });
  // Option indexes in preference order.
  const ballots = [[1, 0, 3], [0, 1, 2], [1, 3, 0], [1, 0, 2], [3, 1, 0]];
  for (const [i, ballot] of ballots.entries()) {
    await db.pollResponse.create({
      data: {
        pollId: poll.id,
        voterToken: `seed-ranking-${i}`,
        voterName: voters[i],
        comment: i === 1 ? "Dark mode is the most requested thing in support tickets." : undefined,
        answers: { create: ballot.map((index, rank) => ({ optionId: poll.options[index].id, value: rank + 1 })) },
      },
    });
  }
  return poll;
}

async function seedRatingPoll(creatorId: string) {
  const setup = ratingPollType.setupSchema.parse({
    config: { scale: 5, lowLabel: "Not keen", highLabel: "Love it" },
    options: ["Lisbon", "Barcelona", "Amsterdam"].map((label) => ({ label })),
  });
  const poll = await db.poll.create({
    data: {
      creatorId,
      slug: createSlug(),
      type: "RATING",
      template: "OFFSITE_LOCATION",
      title: "Where should we go for the offsite?",
      description: "Rate each place from 1 to 5.",
      config: setup.config,
      isAnonymous: true,
      closesAt: new Date(Date.now() + 2 * DAY),
      options: { create: setup.options },
    },
    include: { options: { orderBy: { position: "asc" } } },
  });
  // Barcelona is deliberately polarising: loved or disliked, rarely in between.
  const grid = [[5, 1, 3], [4, 5, 3], [4, 1, 2], [5, 5, 4], [4, 2, 3]];
  const comments: Record<number, string> = { 1: "Barcelona for the beach!", 2: "Please not somewhere too hot." };
  for (const [i, scores] of grid.entries()) {
    await db.pollResponse.create({
      data: {
        pollId: poll.id,
        voterToken: `seed-rating-${i}`,
        comment: comments[i],
        answers: { create: scores.map((value, index) => ({ optionId: poll.options[index].id, value })) },
      },
    });
  }
  return poll;
}

/** A poll that has already closed, to show final results and the closed vote page. */
async function seedClosedPoll(creatorId: string) {
  const setup = choicePollType.setupSchema.parse({
    config: { multi: false, maxSelections: null },
    options: ["Pizza", "Sushi", "Tacos"].map((label) => ({ label })),
  });
  const poll = await db.poll.create({
    data: {
      creatorId,
      slug: createSlug(),
      type: "CHOICE",
      template: "CUSTOM",
      title: "Friday team lunch",
      description: "Voting has closed; see the final result.",
      config: setup.config,
      closedAt: new Date(Date.now() - DAY),
      createdAt: new Date(Date.now() - 3 * DAY),
      options: { create: setup.options },
    },
    include: { options: { orderBy: { position: "asc" } } },
  });
  const picks = [1, 1, 0, 1, 2, 1];
  for (const [i, index] of picks.entries()) {
    await db.pollResponse.create({
      data: {
        pollId: poll.id,
        voterToken: `seed-closed-${i}`,
        voterName: voters[i],
        createdAt: new Date(Date.now() - 2 * DAY),
        answers: { create: { optionId: poll.options[index].id, value: 1 } },
      },
    });
  }
  return poll;
}

/**
 * A private poll shared with a group (which the demo voter is in) plus one
 * direct invite for someone who hasn't signed up yet.
 */
async function seedPrivatePoll(creatorId: string, voter: { id: string; name: string }) {
  const setup = choicePollType.setupSchema.parse({
    config: { multi: false, maxSelections: null },
    options: ["Keep the current plan", "Switch to the premium tier", "Drop it for now"].map((label) => ({ label })),
  });
  const group = await db.group.create({
    data: {
      ownerId: creatorId,
      name: "Leadership team",
      members: { create: [VOTER_EMAIL, "alex@example.com", "priya@example.com"].map((email) => ({ email })) },
    },
  });
  const poll = await db.poll.create({
    data: {
      creatorId,
      slug: createSlug(),
      type: "CHOICE",
      template: "CUSTOM",
      title: "Budget call: analytics subscription",
      description: "Just for the leadership team. Results show once you've voted.",
      config: setup.config,
      visibility: "PRIVATE",
      resultsVisibility: "AFTER_VOTE",
      closesAt: new Date(Date.now() + 4 * DAY),
      options: { create: setup.options },
      invites: { create: { email: "new.hire@example.com" } },
      groups: { create: { groupId: group.id } },
    },
    include: { options: { orderBy: { position: "asc" } } },
  });
  await db.pollResponse.create({
    data: {
      pollId: poll.id,
      voterToken: "seed-private-0",
      voterName: voter.name,
      userId: voter.id,
      answers: { create: { optionId: poll.options[0].id, value: 1 } },
    },
  });
  return poll;
}

/** Hand-written demo polls with known outcomes, owned by the demo organiser. */
export async function seedShowcase() {
  // Idempotent: removing the demo users cascades to their polls and votes.
  await db.user.deleteMany({ where: { email: { in: [DEMO_EMAIL, VOTER_EMAIL] } } });

  const passwordHash = await hash(DEMO_PASSWORD);
  const demo = await db.user.create({ data: { email: DEMO_EMAIL, name: "Demo Organiser", passwordHash } });
  const voter = await db.user.create({ data: { email: VOTER_EMAIL, name: "Sam Voter", passwordHash } });

  const polls = [
    await seedChoicePoll(demo.id, voter.id),
    await seedAvailabilityPoll(demo.id),
    await seedRankingPoll(demo.id),
    await seedRatingPoll(demo.id),
    await seedClosedPoll(demo.id),
    await seedPrivatePoll(demo.id, voter),
  ];

  return { demo, voter, passwordHash, polls };
}

