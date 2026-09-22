import { z } from "zod";
import type { PollTemplate, PollType } from "@/generated/prisma/enums";
import { toFieldErrors, type FieldErrors } from "@/lib/errors";
import { pollDetailsSchema, pollSettingsSchema, type PollSettings } from "@/lib/validation/poll";
import { getPollType, isSupportedPollType } from "@/poll-types/registry";
import type { PollSetup } from "@/poll-types/types";

/** What the create/edit form sends: plain JSON, dates as ISO strings. */
export type PollSubmission = {
  template: PollTemplate;
  type: PollType;
  title: string;
  description: string;
  config: unknown;
  options: unknown[];
  settings: {
    closesAt: string | null;
    allowVoteChange: boolean;
    isAnonymous: boolean;
    requireLogin: boolean;
    resultsVisibility: PollSettings["resultsVisibility"];
    visibility: PollSettings["visibility"];
    expectedParticipants: number | null;
  };
};

type ParsedPoll = z.output<typeof pollDetailsSchema> & PollSetup & { settings: PollSettings };

export type SubmissionResult =
  | { success: true; data: ParsedPoll }
  | { success: false; fieldErrors: FieldErrors };

const prefixed = (errors: FieldErrors, prefix: string): FieldErrors =>
  Object.fromEntries(
    Object.entries(errors).map(([key, messages]) => [
      key === "_form" ? prefix : `${prefix}.${key}`,
      messages,
    ]),
  );

/**
 * Validates a whole poll in one pass and returns every problem at once, keyed
 * by field path (`title`, `settings.closesAt`, `options.2.label`, …). Shared
 * by the form (instant feedback) and the server action (authoritative).
 */
export function parsePollSubmission(input: unknown): SubmissionResult {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Partial<PollSubmission>;
  let fieldErrors: FieldErrors = {};

  const details = pollDetailsSchema.safeParse(raw);
  if (!details.success) fieldErrors = { ...fieldErrors, ...toFieldErrors(details.error) };

  const settings = pollSettingsSchema.safeParse(raw.settings ?? {});
  if (!settings.success) fieldErrors = { ...fieldErrors, ...prefixed(toFieldErrors(settings.error), "settings") };

  // Options only depend on the type, so check them even if e.g. the title is bad.
  const type = pollDetailsSchema.shape.type.safeParse(raw.type);
  let setup: PollSetup | null = null;
  if (type.success) {
    if (!isSupportedPollType(type.data)) {
      fieldErrors.type = ["This poll type isn't available yet"];
    } else {
      const parsed = getPollType(type.data).setupSchema.safeParse({
        config: raw.config,
        options: raw.options,
      });
      if (parsed.success) setup = parsed.data;
      else fieldErrors = { ...fieldErrors, ...toFieldErrors(parsed.error) };
    }
  }

  if (!details.success || !settings.success || !setup) return { success: false, fieldErrors };
  return { success: true, data: { ...details.data, ...setup, settings: settings.data } };
}
