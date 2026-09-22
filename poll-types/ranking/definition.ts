import { z } from "zod";
import { definePollType } from "../types";
import { labelledOptionsSchema, optionIdSchema, toLabelledOptionRows } from "../shared";
import { computeRankingInsights, type RankingInsights } from "./insights";

export const rankingConfigSchema = z.object({
  /** Voters rank their top N; null means rank every option. */
  rankTop: z.number().int().min(1, "Must be at least 1").nullable().default(null),
});

export type RankingConfig = z.output<typeof rankingConfigSchema>;

export const DEFAULT_RANKING_CONFIG: RankingConfig = { rankTop: null };

/** How many options each ballot ranks. */
export const ballotSize = (config: RankingConfig, optionCount: number) =>
  Math.min(config.rankTop ?? optionCount, optionCount);

export type RankingAnswers = { ranking: string[] };

const setupSchema = z
  .object({ config: rankingConfigSchema, options: labelledOptionsSchema })
  .superRefine(({ config, options }, ctx) => {
    if (config.rankTop !== null && config.rankTop > options.length) {
      ctx.addIssue({
        code: "custom",
        message: `Can't exceed the number of options (${options.length})`,
        path: ["config", "rankTop"],
      });
    }
  })
  .transform(({ config, options }) => ({
    // Ranking every option is stored as null, so adding options later still means "all".
    config: { rankTop: config.rankTop === options.length ? null : config.rankTop },
    options: toLabelledOptionRows(options),
  }));

export const rankingPollType = definePollType<RankingAnswers, RankingInsights>({
  type: "RANKING",
  label: "Ranking",
  description: "Put options in order of preference.",
  setupSchema,

  answersSchema({ config, options }) {
    const size = ballotSize(rankingConfigSchema.parse(config), options.length);
    return z
      .object({
        ranking: z
          .array(optionIdSchema(new Set(options.map((option) => option.id))))
          .length(size, size === options.length ? "Rank every option" : `Rank your top ${size}`)
          .refine((ids) => new Set(ids).size === ids.length, { error: "Each option can only be ranked once" }),
      })
      .transform(({ ranking }) => ranking.map((optionId, index) => ({ optionId, value: index + 1 })));
  },

  toAnswerInput(rows) {
    return { ranking: [...rows].sort((a, b) => a.value - b.value).map((row) => row.optionId) };
  },

  computeInsights(ctx) {
    return computeRankingInsights(ctx, rankingConfigSchema.parse(ctx.poll.config));
  },

  csvValue(value) {
    return value === undefined ? "" : String(value);
  },

  summarizeAnswers(rows, { options }) {
    const labels = new Map(options.map((option) => [option.id, option.label]));
    return [...rows]
      .sort((a, b) => a.value - b.value)
      .map((row) => `${row.value}. ${labels.get(row.optionId) ?? "?"}`)
      .join(", ");
  },
});
