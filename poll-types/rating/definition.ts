import { z } from "zod";
import { definePollType } from "../types";
import { labelledOptionsSchema, optionIdSchema, toLabelledOptionRows } from "../shared";
import { computeRatingInsights, type RatingInsights } from "./insights";

const endLabel = (fallback: string) =>
  z.string().trim().max(30, "Keep it under 30 characters").transform((value) => value || fallback);

export const ratingConfigSchema = z.object({
  scale: z.union([z.literal(5), z.literal(10)], { error: "Choose a 1–5 or 1–10 scale" }).default(5),
  lowLabel: endLabel("Poor").default("Poor"),
  highLabel: endLabel("Great").default("Great"),
});

export type RatingConfig = z.output<typeof ratingConfigSchema>;

export const DEFAULT_RATING_CONFIG: RatingConfig = { scale: 5, lowLabel: "Poor", highLabel: "Great" };

export type RatingAnswers = { ratings: Record<string, number> };

const setupSchema = z
  .object({ config: ratingConfigSchema, options: labelledOptionsSchema })
  .transform(({ config, options }) => ({ config, options: toLabelledOptionRows(options) }));

export const ratingPollType = definePollType<RatingAnswers, RatingInsights>({
  type: "RATING",
  label: "Rating",
  description: "Score each option on a scale.",
  setupSchema,

  answersSchema({ config, options }) {
    const { scale } = ratingConfigSchema.parse(config);
    const optionIds = new Set(options.map((option) => option.id));
    return z
      .object({
        ratings: z.record(
          optionIdSchema(optionIds),
          z.number().int().min(1, `Rate from 1 to ${scale}`).max(scale, `Rate from 1 to ${scale}`),
        ),
      })
      .refine(({ ratings }) => [...optionIds].every((id) => id in ratings), {
        error: "Rate every option",
        path: ["ratings"],
      })
      .transform(({ ratings }) => Object.entries(ratings).map(([optionId, value]) => ({ optionId, value })));
  },

  toAnswerInput(rows) {
    return { ratings: Object.fromEntries(rows.map((row) => [row.optionId, row.value])) };
  },

  computeInsights(ctx) {
    return computeRatingInsights(ctx, ratingConfigSchema.parse(ctx.poll.config));
  },

  csvValue(value) {
    return value === undefined ? "" : String(value);
  },

  summarizeAnswers(rows, { options }) {
    const value = new Map(rows.map((row) => [row.optionId, row.value]));
    return options
      .filter((option) => value.has(option.id))
      .map((option) => `${option.label}: ${value.get(option.id)}`)
      .join(", ");
  },
});
