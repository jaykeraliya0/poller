"use client";

import { useRef } from "react";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { draftKey } from "@/lib/draft-key";
import type { FieldErrors } from "@/lib/errors";
import { POLL_LIMITS } from "@/lib/validation/poll";

/** `id` is set for options already saved on the poll. */
export type LabelDraft = { key: string; label: string; id?: string };

export const newLabelDraft = (label = "", id?: string): LabelDraft => ({ key: draftKey(), label, ...(id && { id }) });

type OptionListEditorProps = {
  options: LabelDraft[];
  onChange: (options: LabelDraft[]) => void;
  errors: FieldErrors;
  /** Saved options with votes: they can be renamed and moved, not removed. */
  lockedIds?: ReadonlySet<string>;
  min?: number;
  max?: number;
};

/** Add, edit, reorder and remove text options. Enter on the last row adds another. */
export function OptionListEditor({
  options,
  onChange,
  errors,
  lockedIds,
  min = POLL_LIMITS.optionsMin,
  max = POLL_LIMITS.optionsMax,
}: OptionListEditorProps) {
  const inputs = useRef(new Map<string, HTMLInputElement>());
  /** Key of a row that should grab focus as soon as it's mounted (just added). */
  const focusOnMount = useRef<string | null>(null);
  const canAdd = options.length < max;

  const focusRow = (key: string) => inputs.current.get(key)?.focus();

  const add = () => {
    if (!canAdd) return;
    const draft = newLabelDraft();
    focusOnMount.current = draft.key;
    onChange([...options, draft]);
  };

  const update = (index: number, label: string) =>
    onChange(options.map((option, i) => (i === index ? { ...option, label } : option)));

  const remove = (index: number) => onChange(options.filter((_, i) => i !== index));

  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= options.length) return;
    const next = [...options];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    focusRow(options[index].key);
  };

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3" aria-label="Options">
        {options.map((option, index) => {
          const rowErrors = errors[`options.${index}.label`];
          const errorId = `${option.key}-error`;
          const locked = Boolean(option.id && lockedIds?.has(option.id));
          return (
            <li key={option.key} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="hidden w-6 shrink-0 text-center text-sm text-muted-foreground tabular-nums sm:block" aria-hidden>
                  {index + 1}
                </span>
                <Input
                  ref={(node) => {
                    if (!node) {
                      inputs.current.delete(option.key);
                      return;
                    }
                    inputs.current.set(option.key, node);
                    if (focusOnMount.current === option.key) {
                      focusOnMount.current = null;
                      node.focus();
                    }
                  }}
                  value={option.label}
                  onChange={(event) => update(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (index === options.length - 1) add();
                      else focusRow(options[index + 1].key);
                    }
                  }}
                  placeholder={`Option ${index + 1}`}
                  aria-label={`Option ${index + 1}`}
                  aria-invalid={rowErrors ? true : undefined}
                  aria-describedby={rowErrors ? errorId : undefined}
                  maxLength={POLL_LIMITS.optionLabelMax}
                  className="h-11"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className="size-10"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move option ${index + 1} up`}
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className="size-10"
                  onClick={() => move(index, 1)}
                  disabled={index === options.length - 1}
                  aria-label={`Move option ${index + 1} down`}
                >
                  <ArrowDownIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className="size-10"
                  onClick={() => remove(index)}
                  disabled={locked || options.length <= min}
                  aria-label={locked ? `Option ${index + 1} has votes and can't be removed` : `Remove option ${index + 1}`}
                  title={locked ? "Has votes, so it can't be removed" : undefined}
                >
                  <XIcon />
                </Button>
              </div>
              <FieldError id={errorId} className="sm:pl-7.5" errors={rowErrors?.map((message) => ({ message }))} />
            </li>
          );
        })}
      </ol>

      <FieldError errors={errors.options?.map((message) => ({ message }))} />

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" size="lg" onClick={add} disabled={!canAdd} className="h-11">
          <PlusIcon data-icon="inline-start" />
          Add option
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {options.length}/{max}
        </span>
      </div>
    </div>
  );
}
