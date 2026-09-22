"use client";

import { FieldShell } from "@/components/forms/field-shell";
import { Input } from "@/components/ui/input";
import type { PollTypeEditor, TypeEditorProps } from "../editor-types";
import { labelOptionEditor } from "../label-editor";
import { DEFAULT_RANKING_CONFIG, type RankingConfig } from "./definition";

function RankingConfigFields({ config, onConfigChange, errors, configLocked }: TypeEditorProps) {
  const { rankTop } = config as RankingConfig;
  return (
    <FieldShell
      label="How many should each voter rank?"
      description={configLocked ? "Locked because people have already voted." : "Leave empty to rank every option."}
      errors={errors["config.rankTop"]}
    >
      {(control) => (
        <Input
          {...control}
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="All"
          disabled={configLocked}
          className="max-w-32"
          value={rankTop ?? ""}
          onChange={(event) => onConfigChange({ rankTop: event.target.value === "" ? null : Number(event.target.value) })}
        />
      )}
    </FieldShell>
  );
}

export const rankingEditor: PollTypeEditor = {
  ...labelOptionEditor,
  defaultConfig: () => ({ ...DEFAULT_RANKING_CONFIG }),
  ConfigFields: RankingConfigFields,
};
