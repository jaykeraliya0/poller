import { z } from "zod";
import { PollTemplate, PollType, PollVisibility, ResultsVisibility } from "@/generated/prisma/enums";

export const POLL_LIMITS = {
  titleMin: 3,
  titleMax: 120,
  descriptionMax: 500,
  optionLabelMax: 200,
  optionsMin: 2,
  optionsMax: 20,
  slotsMax: 50,
  commentMax: 500,
  voterNameMax: 60,
  expectedParticipantsMax: 10_000,
} as const;

/** Trims, then turns "" into undefined so optional text fields stay optional. */
export const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((value) => (value === "" ? undefined : value))
    .optional();

export const pollSettingsSchema = z.object({
  closesAt: z.coerce
    .date({ error: "Pick a valid date and time" })
    .nullable()
    .refine((date) => date === null || date.getTime() > Date.now(), {
      error: "Deadline must be in the future",
    }),
  allowVoteChange: z.boolean(),
  isAnonymous: z.boolean(),
  requireLogin: z.boolean(),
  resultsVisibility: z.enum(ResultsVisibility),
  visibility: z.enum(PollVisibility),
  expectedParticipants: z
    .number({ error: "Enter a whole number" })
    .int("Enter a whole number")
    .min(1, "Must be at least 1")
    .max(POLL_LIMITS.expectedParticipantsMax, "That's more than we support")
    .nullable(),
});

export type PollSettings = z.output<typeof pollSettingsSchema>;

export const DEFAULT_POLL_SETTINGS: PollSettings = {
  closesAt: null,
  allowVoteChange: true,
  isAnonymous: false,
  requireLogin: false,
  resultsVisibility: "PUBLIC",
  visibility: "PUBLIC",
  expectedParticipants: null,
};

/**
 * Fields shared by every poll type. `config` and `options` are validated
 * separately by the poll-type registry because their shape depends on `type`.
 */
export const pollDetailsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(POLL_LIMITS.titleMin, `Title must be at least ${POLL_LIMITS.titleMin} characters`)
    .max(POLL_LIMITS.titleMax, `Title must be ${POLL_LIMITS.titleMax} characters or fewer`),
  description: optionalText(POLL_LIMITS.descriptionMax, "Description"),
  type: z.enum(PollType),
  template: z.enum(PollTemplate).default("CUSTOM"),
});
