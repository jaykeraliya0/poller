import type { PollType } from "@/generated/prisma/enums";
import { availabilityPollType } from "./availability/definition";
import type { AvailabilityInsights } from "./availability/insights";
import { choicePollType } from "./choice/definition";
import type { ChoiceInsights } from "./choice/insights";
import type { PollTypeDefinition } from "./types";

export type TypeInsights = ChoiceInsights | AvailabilityInsights;

// Ranking and rating join in Phase 7; then this becomes a full Record<PollType, …>.
const registry: Partial<Record<PollType, PollTypeDefinition<unknown, TypeInsights>>> = {
  CHOICE: choicePollType as PollTypeDefinition<unknown, TypeInsights>,
  AVAILABILITY: availabilityPollType as PollTypeDefinition<unknown, TypeInsights>,
};

export function isSupportedPollType(type: PollType): boolean {
  return type in registry;
}

export function getPollType(type: PollType): PollTypeDefinition<unknown, TypeInsights> {
  const definition = registry[type];
  if (!definition) throw new Error(`Poll type ${type} is not supported yet`);
  return definition;
}

export const supportedPollTypes = Object.values(registry);
