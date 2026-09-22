import type { ComponentType } from "react";
import type { FieldErrors } from "@/lib/errors";
import type { InsightOption } from "@/lib/insights/types";
import type { AnswerRow } from "./types";

export type VoteOption = InsightOption;

export type VoteInputProps = {
  config: unknown;
  options: VoteOption[];
  /** Type-specific answer shape (see each definition's `Answers`). */
  value: unknown;
  onChange: (value: unknown) => void;
  /** Full error map; inputs read `answers.*` paths. */
  errors: FieldErrors;
  /** Options added after this voter last voted. */
  newOptionIds: ReadonlySet<string>;
  disabled?: boolean;
};

export type AnswerSummaryProps = {
  config: unknown;
  options: VoteOption[];
  rows: AnswerRow[];
};

/** Client-side counterpart to the registry for the voting page. */
export type PollTypeVoteUI = {
  emptyAnswers: (options: VoteOption[]) => unknown;
  /** Short progress text for the submit bar, e.g. "2 of 3 picked". */
  progress: (value: unknown, options: VoteOption[], config: unknown) => string;
  VoteInput: ComponentType<VoteInputProps>;
  /** Read-only view of a submitted vote. */
  AnswerSummary: ComponentType<AnswerSummaryProps>;
};
