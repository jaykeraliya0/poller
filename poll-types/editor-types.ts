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
};

export type PollTypeEditor = {
  /** Options with the same kind survive switching between types. */
  optionKind: "label" | "slot";
  sectionTitle: string;
  sectionDescription: string;
  defaultConfig: () => unknown;
  initialOptions: (labels: string[]) => unknown[];
  /** Converts drafts into what the setup schema validates. */
  toSubmission: (config: unknown, options: unknown[]) => { config: unknown; options: unknown[] };
  ConfigFields?: ComponentType<TypeEditorProps>;
  OptionsEditor: ComponentType<TypeEditorProps>;
};
