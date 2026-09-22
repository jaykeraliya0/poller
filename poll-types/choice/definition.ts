import { z } from "zod";
import { definePollType } from "../types";
import { labelledOptionsSchema, optionIdSchema, toLabelledOptionRows } from "../shared";
import { computeChoiceInsights, type ChoiceInsights } from "./insights";

export const choiceConfigSchema = z.object({
  multi: z.boolean().default(false),
  /** Only meaningful when `multi`; null means "any number". */
  maxSelections: z.number().int().min(1).nullable().default(null),
});

export type ChoiceConfig = z.output<typeof choiceConfigSchema>;

export const DEFAULT_CHOICE_CONFIG: ChoiceConfig = { multi: false, maxSelections: null };

export type ChoiceAnswers = { optionIds: string[] };

const setupSchema = z
  .object({ config: choiceConfigSchema, options: labelledOptionsSchema })
  .superRefine(({ config, options }, ctx) => {
    if (config.multi && config.maxSelections !== null && config.maxSelections > options.length) {
      ctx.addIssue({
        code: "custom",
        message: `Can't exceed the number of options (${options.length})`,
        path: ["config", "maxSelections"],
      });
    }
  })
  .transform(({ config, options }) => ({
    config: { multi: config.multi, maxSelections: config.multi ? config.maxSelections : null },
    options: toLabelledOptionRows(options),
  }));

export const choicePollType = definePollType<ChoiceAnswers, ChoiceInsights>({
  type: "CHOICE",
  label: "Multiple choice",
  description: "Pick one option, or several.",
  setupSchema,

  answersSchema({ config, options }) {
    const { multi, maxSelections } = choiceConfigSchema.parse(config);
    const limit = multi ? (maxSelections ?? options.length) : 1;
    return z
      .object({
        optionIds: z
          .array(optionIdSchema(new Set(options.map((option) => option.id))))
          .min(1, multi ? "Pick at least one option" : "Pick an option")
          .max(limit, multi ? `Pick up to ${limit} options` : "Pick only one option")
          .refine((ids) => new Set(ids).size === ids.length, { error: "Duplicate selection" }),
      })
      .transform(({ optionIds }) => optionIds.map((optionId) => ({ optionId, value: 1 })));
  },

  toAnswerInput(rows) {
    return { optionIds: rows.map((row) => row.optionId) };
  },

  computeInsights(ctx) {
    return computeChoiceInsights(ctx, choiceConfigSchema.parse(ctx.poll.config));
  },

  csvValue(value) {
    return value ? "1" : "";
  },

  summarizeAnswers(rows, { options }) {
    const picked = new Set(rows.map((row) => row.optionId));
    return options
      .filter((option) => picked.has(option.id))
      .map((option) => option.label)
      .join(", ");
  },
});
