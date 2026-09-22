import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { createSlug } from "./slug";
import { parsePollSubmission } from "./submission";

const SLUG_ATTEMPTS = 3;

export async function createPoll(creatorId: string, input: unknown) {
  const parsed = parsePollSubmission(input);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, undefined, { fieldErrors: parsed.fieldErrors });
  }
  const { settings, options, ...poll } = parsed.data;

  // Slugs are random; retry the (astronomically rare) collision instead of failing.
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.poll.create({
        data: {
          ...poll,
          ...settings,
          creatorId,
          slug: createSlug(),
          options: { create: options },
        },
        select: { id: true, slug: true },
      });
    } catch (error) {
      const slugTaken =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!slugTaken || attempt >= SLUG_ATTEMPTS) throw error;
    }
  }
}

export async function listPollsForOwner(creatorId: string) {
  return db.poll.findMany({
    where: { creatorId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      closesAt: true,
      closedAt: true,
      createdAt: true,
      expectedParticipants: true,
      _count: { select: { responses: true } },
    },
  });
}
