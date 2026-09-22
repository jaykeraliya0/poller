import type { PollType } from "@/generated/prisma/enums";
import { availabilityEditor } from "./availability/editor";
import { choiceEditor } from "./choice/editor";
import type { PollTypeEditor } from "./editor-types";

/** Client-side counterpart to registry.ts: form editors per poll type. */
const editors: Partial<Record<PollType, PollTypeEditor>> = {
  CHOICE: choiceEditor,
  AVAILABILITY: availabilityEditor,
};

export function getPollTypeEditor(type: PollType): PollTypeEditor {
  const editor = editors[type];
  if (!editor) throw new Error(`No editor for poll type ${type}`);
  return editor;
}
