import "server-only";
import type { PollType } from "@/generated/prisma/enums";
import { utcDayKey } from "@/lib/datetime";
import { db } from "@/lib/db";
import { pollShareUrl } from "@/lib/urls";
import { getPollType } from "@/poll-types/registry";

/** Bump when a field changes meaning or goes away, so scripts reading exports can tell. */
const EXPORT_VERSION = 1;

export type AccountExport = Awaited<ReturnType<typeof loadAccountExport>>;

/**
 * Everything the account holds: the profile, every poll they created with its
 * responses, their groups, and the votes they cast on other people's polls.
 *
 * Their own polls are exported exactly as the per-poll download shows them, so
 * an anonymous poll still hides voter names and exact times here. Votes they
 * cast elsewhere are their own data, so those are never redacted.
 */
export async function loadAccountExport(userId: string, now: Date = new Date()) {
  const account = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerifiedAt: true,
      emailNotifications: true,
      createdAt: true,
    },
  });

  const [polls, groups, votes] = await Promise.all([
    db.poll.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "asc" },
      include: {
        options: { orderBy: { position: "asc" } },
        invites: { orderBy: { createdAt: "asc" }, select: { email: true, createdAt: true } },
        groups: { select: { createdAt: true, group: { select: { id: true, name: true } } } },
        responses: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            voterName: true,
            comment: true,
            createdAt: true,
            updatedAt: true,
            answers: { select: { optionId: true, value: true } },
          },
        },
      },
    }),
    db.group.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
      include: { members: { orderBy: { createdAt: "asc" }, select: { email: true, createdAt: true } } },
    }),
    db.pollResponse.findMany({
      where: { userId, poll: { creatorId: { not: userId } } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        voterName: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
        answers: { select: { optionId: true, value: true } },
        poll: {
          select: {
            id: true,
            slug: true,
            title: true,
            type: true,
            config: true,
            isAnonymous: true,
            options: { orderBy: { position: "asc" }, select: { id: true, label: true } },
          },
        },
      },
    }),
  ]);

  return { account, polls, groups, votes, generatedAt: now };
}

type LabelledOption = { id: string; label: string };

function answerList(answers: { optionId: string; value: number }[], options: LabelledOption[], type: PollType) {
  const labels = new Map(options.map((option) => [option.id, option.label]));
  const definition = getPollType(type);
  return answers.map((answer) => ({
    optionId: answer.optionId,
    option: labels.get(answer.optionId) ?? null,
    value: answer.value,
    display: definition.csvValue(answer.value),
  }));
}

/** The whole account as one JSON document, for the "Download my data" button. */
export function buildAccountJson({ account, polls, groups, votes, generatedAt }: AccountExport): string {
  const document = {
    format: "poller.account-export",
    version: EXPORT_VERSION,
    exportedAt: generatedAt,
    account: {
      id: account.id,
      name: account.name,
      email: account.email,
      emailVerifiedAt: account.emailVerifiedAt,
      emailNotifications: account.emailNotifications,
      createdAt: account.createdAt,
    },
    pollsCreated: polls.map((poll) => ({
      id: poll.id,
      url: pollShareUrl(poll.slug),
      title: poll.title,
      description: poll.description,
      type: poll.type,
      typeLabel: getPollType(poll.type).label,
      template: poll.template,
      config: poll.config,
      visibility: poll.visibility,
      resultsVisibility: poll.resultsVisibility,
      isAnonymous: poll.isAnonymous,
      allowVoteChange: poll.allowVoteChange,
      requireLogin: poll.requireLogin,
      expectedParticipants: poll.expectedParticipants,
      createdAt: poll.createdAt,
      closesAt: poll.closesAt,
      closedAt: poll.closedAt,
      archivedAt: poll.archivedAt,
      options: poll.options.map((option) => ({
        id: option.id,
        label: option.label,
        position: option.position,
        startsAt: option.startsAt,
        endsAt: option.endsAt,
        addedAt: option.createdAt,
      })),
      invitedEmails: poll.invites.map((invite) => ({ email: invite.email, invitedAt: invite.createdAt })),
      sharedWithGroups: poll.groups.map((link) => ({
        id: link.group.id,
        name: link.group.name,
        sharedAt: link.createdAt,
      })),
      responses: poll.responses.map((response) => ({
        id: response.id,
        // Anonymous polls hide who voted and when, here as everywhere else.
        ...(poll.isAnonymous
          ? { submittedOn: utcDayKey(response.updatedAt) }
          : { name: response.voterName, submittedAt: response.createdAt, updatedAt: response.updatedAt }),
        comment: response.comment,
        answers: answerList(response.answers, poll.options, poll.type),
      })),
    })),
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      createdAt: group.createdAt,
      members: group.members.map((member) => ({ email: member.email, addedAt: member.createdAt })),
    })),
    votesCast: votes.map((vote) => ({
      id: vote.id,
      poll: { id: vote.poll.id, url: pollShareUrl(vote.poll.slug), title: vote.poll.title, type: vote.poll.type },
      name: vote.voterName,
      comment: vote.comment,
      submittedAt: vote.createdAt,
      updatedAt: vote.updatedAt,
      answers: answerList(vote.answers, vote.poll.options, vote.poll.type),
    })),
  };
  return JSON.stringify(document, null, 2);
}
