"use client";

import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { PollType } from "@/generated/prisma/enums";
import { supportedPollTypes } from "@/poll-types/registry";

type TypePickerProps = {
  value: PollType;
  onChange: (type: PollType) => void;
  errors?: string[];
};

export function TypePicker({ value, onChange, errors }: TypePickerProps) {
  return (
    <FieldSet>
      <FieldLegend variant="label">Poll type</FieldLegend>
      <RadioGroup value={value} onValueChange={(next) => onChange(next as PollType)} className="gap-2 sm:grid-cols-2">
        {supportedPollTypes.map((pollType) => (
          <FieldLabel
            key={pollType.type}
            htmlFor={`type-${pollType.type}`}
          >
            <Field orientation="horizontal">
              <FieldContent>
                <span className="font-medium">{pollType.label}</span>
                <FieldDescription>{pollType.description}</FieldDescription>
              </FieldContent>
              <RadioGroupItem value={pollType.type} id={`type-${pollType.type}`} />
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
      <FieldError errors={errors?.map((message) => ({ message }))} />
    </FieldSet>
  );
}
