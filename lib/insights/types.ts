import type { Poll, PollOption } from "@/generated/prisma/client";

/** The slice of a poll the insights engine needs; keeps tests free of DB rows. */
export type InsightPoll = Pick<
  Poll,
  "type" | "config" | "isAnonymous" | "expectedParticipants" | "closesAt" | "closedAt" | "createdAt"
>;

export type InsightOption = Pick<
  PollOption,
  "id" | "label" | "position" | "startsAt" | "endsAt" | "createdAt"
>;

type InsightAnswer = { optionId: string; value: number };

export type InsightResponse = {
  id: string;
  voterName: string | null;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  answers: InsightAnswer[];
};

export type InsightContext = {
  poll: InsightPoll;
  /** Sorted by position. */
  options: InsightOption[];
  responses: InsightResponse[];
  now: Date;
};
