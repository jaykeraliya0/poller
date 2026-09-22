"use client";

import { FieldShell } from "@/components/forms/field-shell";
import { NativeSelect } from "@/components/forms/native-select";
import { Input } from "@/components/ui/input";
import type { PollTypeEditor, TypeEditorProps } from "../editor-types";
import { labelOptionEditor } from "../label-editor";
import { DEFAULT_RATING_CONFIG, type RatingConfig } from "./definition";

function RatingConfigFields({ config, onConfigChange, errors, configLocked }: TypeEditorProps) {
  const current = config as RatingConfig;
  const set = (patch: Partial<RatingConfig>) => onConfigChange({ ...current, ...patch });
  const locked = configLocked ? "Locked because people have already voted." : undefined;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <FieldShell label="Scale" description={locked} errors={errors["config.scale"]}>
        {(control) => (
          <NativeSelect
            {...control}
            disabled={configLocked}
            value={current.scale}
            onChange={(event) => set({ scale: Number(event.target.value) as RatingConfig["scale"] })}
          >
            <option value={5}>1 to 5</option>
            <option value={10}>1 to 10</option>
          </NativeSelect>
        )}
      </FieldShell>
      <FieldShell label="Lowest means" errors={errors["config.lowLabel"]}>
        {(control) => (
          <Input
            {...control}
            disabled={configLocked}
            maxLength={30}
            className="h-11"
            value={current.lowLabel}
            onChange={(event) => set({ lowLabel: event.target.value })}
          />
        )}
      </FieldShell>
      <FieldShell label="Highest means" errors={errors["config.highLabel"]}>
        {(control) => (
          <Input
            {...control}
            disabled={configLocked}
            maxLength={30}
            className="h-11"
            value={current.highLabel}
            onChange={(event) => set({ highLabel: event.target.value })}
          />
        )}
      </FieldShell>
    </div>
  );
}

export const ratingEditor: PollTypeEditor = {
  ...labelOptionEditor,
  defaultConfig: () => ({ ...DEFAULT_RATING_CONFIG }),
  ConfigFields: RatingConfigFields,
};
