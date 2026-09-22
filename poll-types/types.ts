import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { PollType } from "@/generated/prisma/enums";
import type { InsightContext, InsightOption } from "@/lib/insights/types";

/** An option ready to insert into poll_options. */
export type OptionRow = {
  label: string;
  position: number;
  startsAt: Date | null;
  endsAt: Date | null;
};

/** A validated setup: config for polls.config plus option rows. */
export type PollSetup = {
  config: Prisma.InputJsonObject;
  options: OptionRow[];
};

export type AnswerRow = { optionId: string; value: number };

export type AnswerContext = {
  /** Raw polls.config as stored. */
  config: unknown;
  options: InsightOption[];
};

/**
 * Everything type-specific about a poll that is shared between server and
 * client: validation, storage mapping and insights. React components live in
 * `poll-types/ui.tsx` so this module stays free of client code.
 */
export interface PollTypeDefinition<Answers = unknown, Insights = unknown> {
  type: PollType;
  label: string;
  description: string;
  /** Validates `{ config, options }` from the create/edit form into a PollSetup. */
  setupSchema: z.ZodType<PollSetup>;
  /** Validates a voter's answers for one poll and maps them to answer rows. */
  answersSchema(ctx: AnswerContext): z.ZodType<AnswerRow[], Answers>;
  /** Maps stored answers back to the form shape so voters can edit their vote. */
  toAnswerInput(rows: AnswerRow[]): Answers;
  computeInsights(ctx: InsightContext): Insights;
  /** One-line, human-readable version of a response, for tables and CSV. */
  summarizeAnswers(rows: AnswerRow[], ctx: AnswerContext): string;
}

export function definePollType<Answers, Insights>(
  definition: PollTypeDefinition<Answers, Insights>,
): PollTypeDefinition<Answers, Insights> {
  return definition;
}
