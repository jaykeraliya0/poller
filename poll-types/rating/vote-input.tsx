"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { NewOptionBadge } from "@/components/vote/new-option-badge";
import { FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { AnswerSummaryProps, PollTypeVoteUI, VoteInputProps } from "../vote-types";
import { ratingConfigSchema, type RatingAnswers } from "./definition";

function RatingVoteInput({ config, options, value, onChange, errors, newOptionIds, disabled }: VoteInputProps) {
  const { scale, lowLabel, highLabel } = ratingConfigSchema.parse(config);
  const ratings = (value as RatingAnswers).ratings;
  const error = errors["answers.ratings"] ?? errors.answers;
  const scores = Array.from({ length: scale }, (_, index) => index + 1);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Rate each option from 1 ({lowLabel}) to {scale} ({highLabel}).
      </p>
      {options.map((option) => {
        const missing = error && ratings[option.id] === undefined;
        return (
          <div
            key={option.id}
            data-invalid={missing ? "" : undefined}
            className="flex flex-col gap-3 rounded-2xl border bg-card p-3 data-invalid:border-destructive/60"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium break-words" id={`rate-${option.id}`}>
                {option.label}
              </span>
              {newOptionIds.has(option.id) && <NewOptionBadge />}
            </div>
            <RadioGroup
              aria-labelledby={`rate-${option.id}`}
              value={ratings[option.id] ?? null}
              onValueChange={(next) => onChange({ ratings: { ...ratings, [option.id]: next as number } })}
              disabled={disabled}
              className={cn("grid gap-1 rounded-2xl bg-muted p-1", scale === 5 ? "grid-cols-5" : "grid-cols-5 sm:grid-cols-10")}
            >
              {scores.map((score) => (
                <Radio.Root
                  key={score}
                  value={score}
                  aria-label={`${score}${score === 1 ? `, ${lowLabel}` : score === scale ? `, ${highLabel}` : ""}`}
                  className="flex h-10 items-center justify-center rounded-xl text-sm font-medium text-muted-foreground tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/40 data-checked:bg-primary data-checked:text-primary-foreground data-disabled:opacity-60"
                >
                  {score}
                </Radio.Root>
              ))}
            </RadioGroup>
            <div className="flex justify-between text-xs text-muted-foreground" aria-hidden>
              <span>{lowLabel}</span>
              <span>{highLabel}</span>
            </div>
          </div>
        );
      })}
      <FieldError errors={error?.map((message) => ({ message }))} />
    </div>
  );
}

function RatingAnswerSummary({ config, options, rows }: AnswerSummaryProps) {
  const { scale } = ratingConfigSchema.parse(config);
  const value = new Map(rows.map((row) => [row.optionId, row.value]));
  return (
    <ul className="flex flex-col gap-1.5">
      {options.map((option) => (
        <li key={option.id} className="flex justify-between gap-3 text-sm">
          <span className="break-words">{option.label}</span>
          <span className="shrink-0 text-muted-foreground tabular-nums">
            {value.has(option.id) ? `${value.get(option.id)} / ${scale}` : "Not rated"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export const ratingVoteUI: PollTypeVoteUI = {
  emptyAnswers: () => ({ ratings: {} }),
  progress: (value, options) =>
    `${Object.keys((value as RatingAnswers).ratings).length} of ${options.length} rated`,
  VoteInput: RatingVoteInput,
  AnswerSummary: RatingAnswerSummary,
};
