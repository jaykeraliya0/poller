"use client";

import { OptionListEditor, newLabelDraft, type LabelDraft } from "@/components/poll-form/option-list-editor";
import type { PollTypeEditor, TypeEditorProps } from "./editor-types";

function LabelOptionsEditor({ options, onOptionsChange, errors, lockedOptionIds }: TypeEditorProps) {
  return (
    <OptionListEditor
      options={options as LabelDraft[]}
      onChange={onOptionsChange}
      errors={errors}
      lockedIds={lockedOptionIds}
    />
  );
}

/** Shared by every type whose options are just text (choice, ranking, rating). */
export const labelOptionEditor = {
  optionKind: "label",
  sectionTitle: "Options",
  sectionDescription: "What can people choose from?",
  initialOptions: (labels) => (labels.length >= 2 ? labels : ["", ""]).map((label) => newLabelDraft(label)),
  fromPoll: (_config, options) => options.map((option) => newLabelDraft(option.label, option.id)),
  toSubmission: (config, options) => ({
    config,
    options: (options as LabelDraft[]).map(({ id, label }) => ({ ...(id && { id }), label })),
  }),
  OptionsEditor: LabelOptionsEditor,
} satisfies Omit<PollTypeEditor, "defaultConfig" | "ConfigFields">;
