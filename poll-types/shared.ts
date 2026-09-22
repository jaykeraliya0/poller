import { z } from "zod";
import { POLL_LIMITS } from "@/lib/validation/poll";

/** Label-only options used by choice, ranking and rating polls. */
export const labelledOptionsSchema = z
  .array(
    z.object({
      label: z
        .string()
        .trim()
        .min(1, "Option can't be empty")
        .max(POLL_LIMITS.optionLabelMax, `Keep options under ${POLL_LIMITS.optionLabelMax} characters`),
    }),
  )
  .min(POLL_LIMITS.optionsMin, `Add at least ${POLL_LIMITS.optionsMin} options`)
  .max(POLL_LIMITS.optionsMax, `Up to ${POLL_LIMITS.optionsMax} options`)
  .superRefine((options, ctx) => {
    const seen = new Map<string, number>();
    options.forEach((option, index) => {
      const key = option.label.toLocaleLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({ code: "custom", message: "Duplicate option", path: [index, "label"] });
      }
      seen.set(key, index);
    });
  });

export const toLabelledOptionRows = (options: { label: string }[]) =>
  options.map((option, position) => ({
    label: option.label,
    position,
    startsAt: null,
    endsAt: null,
  }));

/** Answers must reference this poll's options and nothing else. */
export function optionIdSchema(optionIds: Set<string>) {
  return z.string().refine((id) => optionIds.has(id), { error: "Unknown option" });
}
