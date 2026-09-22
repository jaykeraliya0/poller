"use client";

import { CheckIcon } from "lucide-react";
import { NewOptionBadge } from "@/components/vote/new-option-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { AnswerSummaryProps, PollTypeVoteUI, VoteInputProps } from "../vote-types";
import { choiceConfigSchema, type ChoiceAnswers } from "./definition";

const optionCard =
  "flex min-h-13 w-full cursor-pointer items-center gap-3 rounded-[10px] border bg-panel px-4 py-3 transition-[border-color,background-color,box-shadow] hover:border-input has-data-checked:border-signal has-data-checked:bg-signal-wash has-data-checked:shadow-[0_0_0_1px_var(--signal)] has-data-disabled:cursor-not-allowed has-data-disabled:opacity-60";

function BallotHint({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-sm font-medium text-muted-foreground" aria-live="polite">{children}</p>;
}

function OptionText({ label, isNew }: { label: string; isNew: boolean }) {
  return (
    <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
      <span className="text-[0.9375rem] font-medium break-words">{label}</span>
      {isNew && <NewOptionBadge />}
    </span>
  );
}

function ChoiceVoteInput({ config, options, value, onChange, errors, newOptionIds, disabled }: VoteInputProps) {
  const { multi, maxSelections } = choiceConfigSchema.parse(config);
  const selected = (value as ChoiceAnswers).optionIds;
  const limit = multi ? (maxSelections ?? options.length) : 1;
  const atLimit = selected.length >= limit;
  const error = errors["answers.optionIds"] ?? errors.answers;

  if (!multi) {
    return (
      <div className="flex flex-col gap-2">
        <BallotHint>Pick one.</BallotHint>
        <RadioGroup
          value={selected[0] ?? null}
          onValueChange={(optionId) => onChange({ optionIds: [optionId as string] })}
          disabled={disabled}
          aria-label="Options"
          className="gap-2"
        >
          {options.map((option) => (
            <FieldLabel key={option.id} htmlFor={`option-${option.id}`} className={optionCard}>
              <RadioGroupItem value={option.id} id={`option-${option.id}`} />
              <OptionText label={option.label} isNew={newOptionIds.has(option.id)} />
            </FieldLabel>
          ))}
        </RadioGroup>
        <FieldError errors={error?.map((message) => ({ message }))} />
      </div>
    );
  }

  const toggle = (optionId: string, checked: boolean) =>
    onChange({
      optionIds: checked ? [...selected, optionId] : selected.filter((id) => id !== optionId),
    });

  return (
    <div className="flex flex-col gap-2">
      <BallotHint>{maxSelections ? `Pick up to ${maxSelections}.` : "Pick as many as you like."}</BallotHint>
      <div role="group" aria-label="Options" className="flex flex-col gap-2">
        {options.map((option) => {
          const checked = selected.includes(option.id);
          return (
            <FieldLabel key={option.id} htmlFor={`option-${option.id}`} className={optionCard}>
              <Checkbox
                id={`option-${option.id}`}
                checked={checked}
                disabled={disabled || (!checked && atLimit)}
                onCheckedChange={(next) => toggle(option.id, next)}
              />
              <OptionText label={option.label} isNew={newOptionIds.has(option.id)} />
            </FieldLabel>
          );
        })}
      </div>
      <FieldError errors={error?.map((message) => ({ message }))} />
    </div>
  );
}

function ChoiceAnswerSummary({ options, rows }: AnswerSummaryProps) {
  const picked = new Set(rows.map((row) => row.optionId));
  return (
    <ul className="flex flex-col gap-2">
      {options
        .filter((option) => picked.has(option.id))
        .map((option) => (
          <li key={option.id} className="flex items-start gap-2">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
            <span className="break-words">{option.label}</span>
          </li>
        ))}
    </ul>
  );
}

export const choiceVoteUI: PollTypeVoteUI = {
  emptyAnswers: () => ({ optionIds: [] }),
  progress: (value, options, config) => {
    const { multi, maxSelections } = choiceConfigSchema.parse(config);
    const count = (value as ChoiceAnswers).optionIds.length;
    if (!multi) return count ? "1 option picked" : "Pick an option";
    return `${count} of ${maxSelections ?? options.length} picked`;
  },
  VoteInput: ChoiceVoteInput,
  AnswerSummary: ChoiceAnswerSummary,
};
