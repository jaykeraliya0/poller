import type { PollTemplate, PollType } from "@/generated/prisma/enums";

export type TemplateIcon = "calendar" | "list-ordered" | "map-pin" | "presentation" | "sparkles";

export type PollTemplateDefinition = {
  id: PollTemplate;
  name: string;
  tagline: string;
  icon: TemplateIcon;
  type: PollType;
  config: Record<string, unknown>;
  title: string;
  description: string;
  /** Starter options for label-based types; availability starts empty. */
  optionLabels: string[];
};

// FEATURE_PRIORITY and OFFSITE_LOCATION move to RANKING and RATING once those types ship.
export const POLL_TEMPLATES: PollTemplateDefinition[] = [
  {
    id: "EVENT_DATE",
    name: "Find a date",
    tagline: "Pick the time that works for most people.",
    icon: "calendar",
    type: "AVAILABILITY",
    config: {},
    title: "When should we meet?",
    description: "Mark every time slot you could make.",
    optionLabels: [],
  },
  {
    id: "FEATURE_PRIORITY",
    name: "Prioritise features",
    tagline: "Let the team vote on what to build next.",
    icon: "list-ordered",
    type: "CHOICE",
    config: { multi: true, maxSelections: 3 },
    title: "What should we build next?",
    description: "Pick up to three features you think matter most.",
    optionLabels: ["Dark mode", "Offline support", "CSV export", "Faster search"],
  },
  {
    id: "OFFSITE_LOCATION",
    name: "Choose a location",
    tagline: "Settle where the offsite or trip goes.",
    icon: "map-pin",
    type: "CHOICE",
    config: { multi: false, maxSelections: null },
    title: "Where should we go for the offsite?",
    description: "Pick the place you'd most like to go.",
    optionLabels: ["Lisbon", "Barcelona", "Amsterdam"],
  },
  {
    id: "WORKSHOP_TOPIC",
    name: "Pick a workshop topic",
    tagline: "Find out what people want to learn.",
    icon: "presentation",
    type: "CHOICE",
    config: { multi: true, maxSelections: 2 },
    title: "Which workshop should we run?",
    description: "Pick up to two topics you'd attend.",
    optionLabels: ["Testing React apps", "Postgres performance", "Accessibility basics"],
  },
  {
    id: "CUSTOM",
    name: "Start from scratch",
    tagline: "Any question, your own options.",
    icon: "sparkles",
    type: "CHOICE",
    config: { multi: false, maxSelections: null },
    title: "",
    description: "",
    optionLabels: ["", ""],
  },
];

export function getTemplate(id: unknown): PollTemplateDefinition | null {
  return POLL_TEMPLATES.find((template) => template.id === id) ?? null;
}
