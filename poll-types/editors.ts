import type { PollType } from "@/generated/prisma/enums";
import { availabilityEditor } from "./availability/editor";
import { choiceEditor } from "./choice/editor";
import type { PollTypeEditor } from "./editor-types";
import { rankingEditor } from "./ranking/editor";
import { ratingEditor } from "./rating/editor";

/** Client-side counterpart to registry.ts: form editors per poll type. */
const editors: Record<PollType, PollTypeEditor> = {
  CHOICE: choiceEditor,
  AVAILABILITY: availabilityEditor,
  RANKING: rankingEditor,
  RATING: ratingEditor,
};

export function getPollTypeEditor(type: PollType): PollTypeEditor {
  return editors[type];
}
