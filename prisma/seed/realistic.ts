import type { PollTemplate, PollType, ResultsVisibility } from "../../generated/prisma/enums";
import { formatSlotLabel, zonedDateTime } from "../../lib/datetime";
import {
  AVAILABILITY_TOPICS,
  CHOICE_TOPICS,
  COMMENTS,
  EMAIL_DOMAINS,
  FIRST_NAMES,
  GROUP_NAMES,
  LAST_NAMES,
  RANKING_TOPICS,
  RATING_TOPICS,
  TIME_ZONES,
} from "./content";
import { db } from "./db";
import type { Random } from "./random";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type RealisticOptions = {
  random: Random;
  passwordHash: string;
  demoId: string;
  voterId: string;
  users?: number;
  polls?: number;
};

type OptionRow = { id: string; pollId: string; label: string; position: number; startsAt: Date | null; endsAt: Date | null; createdAt: Date };
type ResponseRow = { id: string; pollId: string; voterToken: string; voterName: string | null; comment: string | null; userId: string | null; createdAt: Date; updatedAt: Date };
type AnswerRow = { responseId: string; optionId: string; value: number };
type GroupRow = { id: string; ownerId: string; name: string; createdAt: Date; updatedAt: Date };
type MemberRow = { groupId: string; email: string; createdAt: Date };

const SLUG_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

async function insertInChunks<T>(rows: T[], size: number, insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += size) await insert(rows.slice(i, i + size));
}

/**
 * Generates a large, realistic dataset: users across a few companies, polls of
 * every type and state, and votes drawn from per-poll hidden preferences so
 * results have clear leaders, close races and the occasional tie.
 */
export async function seedRealistic({ random, passwordHash, demoId, voterId, users: userCount = 600, polls: pollCount = 450 }: RealisticOptions) {
  const now = Date.now();

  // ---- Users --------------------------------------------------------------
  const emails = new Set(["demo@poller.dev", "voter@poller.dev"]);
  const users: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    createdAt: Date;
    emailVerifiedAt: Date;
    emailNotifications: boolean;
  }[] = [];
  while (users.length < userCount) {
    const first = random.pick(FIRST_NAMES);
    const last = random.pick(LAST_NAMES);
    const base = `${first}.${last}`.toLowerCase().normalize("NFD").replace(/[^a-z.]/g, "");
    const email = `${base}${random.chance(0.3) ? random.int(1, 99) : ""}@${random.pick(EMAIL_DOMAINS)}`;
    if (emails.has(email)) continue;
    emails.add(email);
    const createdAt = new Date(now - random.int(20, 400) * DAY);
    // Some of these domains are real: never send poll emails to generated people.
    users.push({ id: random.uuid(), email, name: `${first} ${last}`, passwordHash, createdAt, emailVerifiedAt: createdAt, emailNotifications: false });
  }
  const names = new Map(users.map((user) => [user.id, user.name]));
  names.set(voterId, "Sam Voter");
  const everyone = [voterId, ...users.map((user) => user.id)];
  const emailOf = new Map(users.map((user) => [user.id, user.email]));
  emailOf.set(voterId, "voter@poller.dev");
  const idByEmail = new Map([...emailOf].map(([id, email]) => [email, id]));

  // ---- Poll owners: a few power users, a long tail ------------------------
  const owners = random.sample(users, 60).map((user) => user.id);
  const ownerFor = (index: number) =>
    index < 16 ? demoId : random.weighted(owners.map((id, rank) => [id, 1 / (rank + 1)] as const));

  // People invited before they signed up (example.com, so never a real inbox).
  const pendingEmails = new Set<string>();
  const pendingEmail = () => {
    let email: string;
    do email = `${random.pick(FIRST_NAMES)}.${random.pick(LAST_NAMES)}${random.int(1, 999)}@example.com`.toLowerCase().normalize("NFD").replace(/[^a-z0-9.@]/g, "");
    while (pendingEmails.has(email));
    pendingEmails.add(email);
    return email;
  };
  const inviteesFor = (ownerId: string, min: number, max: number) => [
    ...random.sample(everyone.filter((id) => id !== ownerId), random.int(min, max)).map((id) => emailOf.get(id)!),
    ...Array.from({ length: random.int(0, 3) }, pendingEmail),
  ];

  // ---- Groups: the demo organiser and the busiest owners keep saved lists ----
  const groups: GroupRow[] = [];
  const members: MemberRow[] = [];
  const groupsByOwner = new Map<string, { id: string; emails: string[] }[]>();
  for (const ownerId of [demoId, ...owners.slice(0, 30)]) {
    for (const name of random.sample(GROUP_NAMES, random.int(ownerId === demoId ? 3 : 1, ownerId === demoId ? 5 : 3))) {
      const createdAt = new Date(now - random.int(30, 200) * DAY);
      const emails = new Set(inviteesFor(ownerId, 4, 30));
      // The demo voter is in most of the demo organiser's groups, so "Shared with me" has plenty in it.
      if (ownerId === demoId && random.chance(0.7)) emails.add("voter@poller.dev");
      const group = { id: random.uuid(), ownerId, name, createdAt, updatedAt: createdAt };
      groups.push(group);
      members.push(...[...emails].map((email) => ({ groupId: group.id, email, createdAt })));
      groupsByOwner.set(ownerId, [...(groupsByOwner.get(ownerId) ?? []), { id: group.id, emails: [...emails] }]);
    }
  }
  const pollGroups: { pollId: string; groupId: string; createdAt: Date }[] = [];
  const invites: { id: string; pollId: string; email: string; createdAt: Date }[] = [];

  const slugs = new Set<string>();
  const newSlug = () => {
    let slug: string;
    do slug = Array.from({ length: 10 }, () => random.pick([...SLUG_ALPHABET])).join("");
    while (slugs.has(slug));
    slugs.add(slug);
    return slug;
  };

  const polls: Record<string, unknown>[] = [];
  const options: OptionRow[] = [];
  const responses: ResponseRow[] = [];
  const answers: AnswerRow[] = [];

  for (let index = 0; index < pollCount; index++) {
    const pollId = random.uuid();
    const creatorId = ownerFor(index);
    const type = random.weighted<PollType>([["CHOICE", 35], ["AVAILABILITY", 25], ["RANKING", 20], ["RATING", 20]]);

    // ---- Lifecycle ----------------------------------------------------------
    const state = random.weighted([["open", 55], ["closingSoon", 10], ["closed", 35]] as const);
    const createdAt = new Date(now - (state === "closed" ? random.int(3, 90) : random.int(0, 30)) * DAY - random.int(0, 23) * HOUR);
    let closesAt: Date | null = null;
    let closedAt: Date | null = null;
    if (state === "open") {
      closesAt = random.chance(0.6) ? new Date(now + random.int(2, 14) * DAY) : null;
    } else if (state === "closingSoon") {
      closesAt = new Date(now + random.int(1, 20) * HOUR);
    } else if (random.chance(0.5)) {
      closesAt = new Date(createdAt.getTime() + random.int(1, Math.max(1, Math.floor((now - createdAt.getTime()) / DAY) - 1)) * DAY);
    } else {
      closedAt = new Date(createdAt.getTime() + random.int(1, Math.max(1, Math.floor((now - createdAt.getTime()) / DAY) - 1)) * DAY);
    }
    const votingEnd = Math.min(now, closedAt?.getTime() ?? Infinity, closesAt?.getTime() ?? Infinity);

    // ---- Settings -----------------------------------------------------------
    const isAnonymous = random.chance(0.2);
    const requireLogin = random.chance(0.15);
    const resultsVisibility = random.weighted<ResultsVisibility>([["PUBLIC", 55], ["AFTER_VOTE", 25], ["AFTER_CLOSE", 12], ["OWNER_ONLY", 8]]);

    // Mostly small teams, a few company-wide polls, and some near-empty ones (edge cases).
    const bucket = random.weighted([[[0, 0], 3], [[1, 2], 5], [[3, 12], 35], [[13, 40], 37], [[41, 120], 15], [[121, 320], 5]] as const);
    let count = Math.min(random.int(bucket[0], bucket[1]), requireLogin ? everyone.length : Infinity);

    // ---- Private polls: invited people only, directly or through groups ------
    const isPrivate = random.chance(creatorId === demoId ? 0.35 : 0.2);
    let invitedAccounts: string[] = [];
    if (isPrivate) {
      const ownerGroups = groupsByOwner.get(creatorId) ?? [];
      const linked = ownerGroups.length > 0 && random.chance(0.75) ? random.sample(ownerGroups, random.int(1, Math.min(2, ownerGroups.length))) : [];
      const direct = [...new Set(inviteesFor(creatorId, linked.length > 0 ? 0 : 3, 12))];
      pollGroups.push(...linked.map((group) => ({ pollId, groupId: group.id, createdAt })));
      invites.push(...direct.map((email) => ({ id: random.uuid(), pollId, email, createdAt })));
      const invited = new Set([...direct, ...linked.flatMap((group) => group.emails)]);
      invitedAccounts = [...invited].flatMap((email) => {
        const id = idByEmail.get(email);
        return id && id !== creatorId ? [id] : [];
      });
      // Most invitees vote; the rest are who reminders are for.
      count = Math.round(invitedAccounts.length * (0.3 + random.next() * 0.7));
    }
    const expectedParticipants = random.chance(0.6) ? Math.max(1, Math.round(count * (0.85 + random.next() * 0.9))) : null;

    // ---- Topic, config and options -----------------------------------------
    let template: PollTemplate = "CUSTOM";
    let title: string;
    let description: string | null = null;
    let config: Record<string, unknown>;
    const pollOptions: OptionRow[] = [];
    const addOption = (label: string, startsAt: Date | null = null, endsAt: Date | null = null) =>
      pollOptions.push({ id: random.uuid(), pollId, label, position: pollOptions.length, startsAt, endsAt, createdAt });

    if (type === "AVAILABILITY") {
      const topic = random.pick(AVAILABILITY_TOPICS);
      template = "EVENT_DATE";
      title = topic.title;
      description = topic.description ?? "Mark every slot you could make.";
      const timezone = random.pick(TIME_ZONES);
      config = { timezone };
      // Slots a few days after voting ends (in the future for open polls).
      const anchor = new Date(Math.max(votingEnd, now - 60 * DAY) + random.int(1, 7) * DAY);
      const slotTimes: { start: Date; end: Date }[] = [];
      for (let day = 0; day < random.int(2, 4); day++) {
        const date = new Date(anchor.getTime() + day * random.int(1, 2) * DAY).toISOString().slice(0, 10);
        for (const hour of random.sample([9, 10, 12, 14, 16, 17, 18, 19], random.int(1, 3)).sort((a, b) => a - b)) {
          const start = zonedDateTime(date, `${String(hour).padStart(2, "0")}:00`, timezone)!;
          slotTimes.push({ start, end: new Date(start.getTime() + random.pick([60, 90, 120]) * 60_000) });
        }
      }
      slotTimes.sort((a, b) => a.start.getTime() - b.start.getTime());
      const seen = new Set<number>();
      for (const slot of slotTimes) {
        if (seen.has(slot.start.getTime())) continue;
        seen.add(slot.start.getTime());
        addOption(formatSlotLabel(slot.start, slot.end, timezone), slot.start, slot.end);
      }
    } else if (type === "CHOICE") {
      const topic = random.pick(CHOICE_TOPICS);
      template = topic.template ?? "CUSTOM";
      title = topic.title;
      description = topic.description ?? null;
      random.sample(topic.options, random.int(3, Math.min(7, topic.options.length))).forEach((label) => addOption(label));
      config = topic.multi ? { multi: true, maxSelections: Math.min(topic.multi, pollOptions.length) } : { multi: false, maxSelections: null };
    } else if (type === "RANKING") {
      const topic = random.pick(RANKING_TOPICS);
      template = topic.template ?? "CUSTOM";
      title = topic.title;
      description = topic.description ?? "Put these in order of preference.";
      random.sample(topic.options, random.int(4, Math.min(6, topic.options.length))).forEach((label) => addOption(label));
      config = { rankTop: random.chance(0.5) ? 3 : null };
    } else {
      const topic = random.pick(RATING_TOPICS);
      template = topic.template ?? "CUSTOM";
      title = topic.title;
      const scale = random.chance(0.75) ? 5 : 10;
      description = `Rate each from 1 to ${scale}.`;
      random.sample(topic.options, random.int(3, Math.min(6, topic.options.length))).forEach((label) => addOption(label));
      config = { scale, lowLabel: topic.lowLabel, highLabel: topic.highLabel };
    }

    // Sometimes the organiser added an option after voting had started.
    let lateOption: OptionRow | null = null;
    if (count >= 10 && type !== "AVAILABILITY" && random.chance(0.08)) {
      lateOption = pollOptions[pollOptions.length - 1];
      lateOption.createdAt = new Date(createdAt.getTime() + (votingEnd - createdAt.getTime()) * 0.5);
    }

    polls.push({
      id: pollId,
      creatorId,
      visibility: isPrivate ? "PRIVATE" : "PUBLIC",
      slug: newSlug(),
      type,
      template,
      title,
      description,
      config,
      closesAt,
      closedAt,
      // Seeded polls count as already emailed, so the first scheduled run doesn't send a burst about old data.
      resultsEmailedAt: state === "closed" ? new Date(votingEnd) : null,
      autoRemindedAt: state === "closingSoon" ? createdAt : null,
      allowVoteChange: random.chance(0.8),
      isAnonymous,
      requireLogin,
      resultsVisibility,
      expectedParticipants,
      createdAt,
      updatedAt: createdAt,
    });
    options.push(...pollOptions);

    // ---- Hidden preferences for this poll -----------------------------------
    const spread = 0.6 + random.next() * 1.2; // low = close race, high = clear favourite
    const weight = new Map(pollOptions.map((option) => [option.id, Math.exp(random.normal() * spread)]));
    const yesRate = new Map(pollOptions.map((option) => [option.id, 0.15 + random.next() * 0.7]));
    const scale = (config.scale as number | undefined) ?? 5;
    const polarisedId = type === "RATING" && random.chance(0.35) ? random.pick(pollOptions).id : null;
    const ratingMean = new Map(pollOptions.map((option) => [option.id, (1.8 + random.next() * 2.8) * (scale / 5)]));

    // ---- Voters -------------------------------------------------------------
    // Private polls need an account (and an invite) to vote.
    const registeredShare = requireLogin || isPrivate ? 1 : 0.35;
    const accounts = random.sample(isPrivate ? invitedAccounts : everyone, Math.round(count * registeredShare));
    for (let n = 0; n < count; n++) {
      const userId = accounts[n] ?? null;
      // Front-loaded arrivals: most votes come soon after the poll is shared.
      const at = new Date(createdAt.getTime() + (votingEnd - createdAt.getTime()) * random.next() ** 2.2);
      const updatedAt = random.chance(0.1) ? new Date(at.getTime() + (votingEnd - at.getTime()) * random.next()) : at;
      const guestName = `${random.pick(FIRST_NAMES)}${random.chance(0.5) ? ` ${random.pick(LAST_NAMES)[0]}.` : ""}`;
      const comment = random.chance(0.15)
        ? random.chance(0.6)
          ? random.pick(COMMENTS[type])
          : random.pick(COMMENTS.general)
        : null;
      const responseId = random.uuid();
      responses.push({
        id: responseId,
        pollId,
        voterToken: random.uuid(),
        voterName: isAnonymous ? null : userId ? names.get(userId)! : guestName,
        comment,
        userId,
        createdAt: at,
        updatedAt,
      });

      // Earlier voters never saw an option added later.
      const available = pollOptions.filter((option) => option.createdAt <= updatedAt);
      const answer = (optionId: string, value: number) => answers.push({ responseId, optionId, value });

      if (type === "CHOICE") {
        const max = (config.maxSelections as number | null) ?? 1;
        const picks = config.multi ? Math.min(max, random.weighted([[1, 3], [2, 4], [3, 2]] as const)) : 1;
        let pool = [...available];
        for (let p = 0; p < picks && pool.length; p++) {
          const chosen = random.weighted(pool.map((option) => [option, weight.get(option.id)!] as const));
          pool = pool.filter((option) => option !== chosen);
          answer(chosen.id, 1);
        }
      } else if (type === "AVAILABILITY") {
        const flexibility = random.normal() * 0.15;
        for (const option of available) {
          const roll = random.next();
          const yes = yesRate.get(option.id)! + flexibility;
          answer(option.id, roll < yes ? 2 : roll < yes + 0.15 ? 1 : 0);
        }
      } else if (type === "RANKING") {
        // Plackett–Luce via Gumbel noise: noisy but preference-driven orderings.
        const size = Math.min((config.rankTop as number | null) ?? available.length, available.length);
        available
          .map((option) => ({ option, score: Math.log(weight.get(option.id)!) - Math.log(-Math.log(1 - random.next())) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, size)
          .forEach(({ option }, rank) => answer(option.id, rank + 1));
      } else {
        for (const option of available) {
          const value =
            option.id === polarisedId
              ? random.chance(0.5) ? random.int(1, Math.max(1, Math.floor(scale * 0.3))) : random.int(Math.ceil(scale * 0.8), scale)
              : Math.round(ratingMean.get(option.id)! + random.normal() * 0.9 * (scale / 5));
          answer(option.id, Math.min(scale, Math.max(1, value)));
        }
      }
    }
  }

  // ---- Bulk insert, in dependency order ------------------------------------
  await insertInChunks(users, 500, (data) => db.user.createMany({ data }));
  await insertInChunks(polls, 500, (data) => db.poll.createMany({ data: data as never }));
  await insertInChunks(options, 2000, (data) => db.pollOption.createMany({ data }));
  await insertInChunks(responses, 2000, (data) => db.pollResponse.createMany({ data }));
  await insertInChunks(answers, 5000, (data) => db.answer.createMany({ data }));
  await insertInChunks(groups, 500, (data) => db.group.createMany({ data }));
  await insertInChunks(members, 2000, (data) => db.groupMember.createMany({ data }));
  await insertInChunks(pollGroups, 2000, (data) => db.pollGroup.createMany({ data }));
  await insertInChunks(invites, 2000, (data) => db.pollInvite.createMany({ data }));

  return {
    users: users.length,
    polls: polls.length,
    privatePolls: polls.filter((poll) => poll.visibility === "PRIVATE").length,
    groups: groups.length,
    invites: invites.length + members.length,
    options: options.length,
    responses: responses.length,
    answers: answers.length,
  };
}
