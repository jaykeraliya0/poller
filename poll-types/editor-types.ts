import type { ComponentType } from "react";
import type { FieldErrors } from "@/lib/errors";

/**
 * Props every type-specific editor receives. Config and options are opaque to
 * the poll form; each type owns their draft shape.
 */
export type TypeEditorProps = {
  config: unknown;
  options: unknown[];
  onConfigChange: (config: unknown) => void;
  onOptionsChange: (options: unknown[]) => void;
  /** Full error map; editors read `config.*` and `options.*` paths. */
  errors: FieldErrors;
  /** Existing options that have votes and so can't be removed. */
  lockedOptionIds: ReadonlySet<string>;
  /** Type-specific settings are locked once people have voted. */
  configLocked: boolean;
};

/** An option already saved on the poll, when editing. */
export type ExistingOption = { id: string; label: string; startsAt: Date | null; endsAt: Date | null };

export type PollTypeEditor = {
  /** Options with the same kind survive switching between types. */
  optionKind: "label" | "slot";
  sectionTitle: string;
  sectionDescription: string;
  defaultConfig: () => unknown;
  initialOptions: (labels: string[]) => unknown[];
  /** Drafts for an existing poll's options, for the edit form. */
  fromPoll: (config: unknown, options: ExistingOption[]) => unknown[];
  /** Converts drafts into what the setup schema validates. */
  toSubmission: (config: unknown, options: unknown[]) => { config: unknown; options: unknown[] };
  ConfigFields?: ComponentType<TypeEditorProps>;
  OptionsEditor: ComponentType<TypeEditorProps>;
};
