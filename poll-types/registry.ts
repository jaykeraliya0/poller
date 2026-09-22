import type { PollType } from "@/generated/prisma/enums";
import { availabilityPollType } from "./availability/definition";
import type { AvailabilityInsights } from "./availability/insights";
import { choicePollType } from "./choice/definition";
import type { ChoiceInsights } from "./choice/insights";
import { rankingPollType } from "./ranking/definition";
import type { RankingInsights } from "./ranking/insights";
import { ratingPollType } from "./rating/definition";
import type { RatingInsights } from "./rating/insights";
import type { PollTypeDefinition } from "./types";

export type TypeInsights = ChoiceInsights | AvailabilityInsights | RankingInsights | RatingInsights;

type AnyPollType = PollTypeDefinition<unknown, TypeInsights>;

// A full Record: adding a PollType without a definition fails to compile.
const registry: Record<PollType, AnyPollType> = {
  CHOICE: choicePollType as AnyPollType,
  AVAILABILITY: availabilityPollType as AnyPollType,
  RANKING: rankingPollType as AnyPollType,
  RATING: ratingPollType as AnyPollType,
};

export function isSupportedPollType(type: PollType): boolean {
  return type in registry;
}

export function getPollType(type: PollType): AnyPollType {
  return registry[type];
}

export const supportedPollTypes = Object.values(registry);
