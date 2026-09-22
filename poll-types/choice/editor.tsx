"use client";

import { FieldShell } from "@/components/forms/field-shell";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { PollTypeEditor, TypeEditorProps } from "../editor-types";
import { labelOptionEditor } from "../label-editor";
import { DEFAULT_CHOICE_CONFIG, type ChoiceConfig } from "./definition";

function ChoiceConfigFields({ config, onConfigChange, errors, configLocked }: TypeEditorProps) {
  const { multi, maxSelections } = config as ChoiceConfig;

  return (
    <div className="flex flex-col gap-4">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="choice-multi">Allow multiple choices</FieldLabel>
          <FieldDescription>
            {configLocked ? "Locked because people have already voted." : "Voters can pick more than one option."}
          </FieldDescription>
        </FieldContent>
        <Switch
          id="choice-multi"
          disabled={configLocked}
          checked={multi}
          onCheckedChange={(checked) => onConfigChange({ multi: checked, maxSelections: checked ? maxSelections : null })}
        />
      </Field>

      {multi && (
        <FieldShell
          label="Maximum picks per voter"
          description="Leave empty to allow any number."
          errors={errors["config.maxSelections"]}
        >
          {(control) => (
            <Input
              {...control}
              type="number"
              inputMode="numeric"
              min={1}
              disabled={configLocked}
              className="max-w-32"
              value={maxSelections ?? ""}
              onChange={(event) =>
                onConfigChange({
                  multi,
                  maxSelections: event.target.value === "" ? null : Number(event.target.value),
                })
              }
            />
          )}
        </FieldShell>
      )}
    </div>
  );
}

export const choiceEditor: PollTypeEditor = {
  ...labelOptionEditor,
  defaultConfig: () => ({ ...DEFAULT_CHOICE_CONFIG }),
  ConfigFields: ChoiceConfigFields,
};
