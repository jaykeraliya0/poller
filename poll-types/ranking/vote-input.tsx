"use client";

import { useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from "lucide-react";
import { NewOptionBadge } from "@/components/vote/new-option-badge";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import type { AnswerSummaryProps, PollTypeVoteUI, VoteInputProps } from "../vote-types";
import { ballotSize, rankingConfigSchema, type RankingAnswers } from "./definition";

/** Tap-to-rank: works on phones and with keyboards/screen readers, unlike drag and drop. */
function RankingVoteInput({ config, options, value, onChange, errors, newOptionIds, disabled }: VoteInputProps) {
  const size = ballotSize(rankingConfigSchema.parse(config), options.length);
  const ranking = (value as RankingAnswers).ranking;
  const [announcement, setAnnouncement] = useState("");
  const label = new Map(options.map((option) => [option.id, option.label]));
  const unranked = options.filter((option) => !ranking.includes(option.id));
  const full = ranking.length >= size;
  const error = errors["answers.ranking"] ?? errors.answers;

  const update = (next: string[], message: string) => {
    onChange({ ranking: next });
    setAnnouncement(message);
  };
  const add = (id: string) => {
    if (full) return;
    update([...ranking, id], `${label.get(id)} ranked ${ranking.length + 1}`);
  };
  const remove = (index: number) =>
    update(ranking.filter((_, i) => i !== index), `${label.get(ranking[index])} removed from your ranking`);
  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    const next = [...ranking];
    [next[index], next[target]] = [next[target], next[index]];
    update(next, `${label.get(ranking[index])} moved to ${target + 1}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-muted-foreground">
        {size === options.length
          ? "Tap the options in order of preference, favourite first."
          : `Tap your top ${size} in order of preference, favourite first.`}
      </p>

      <div className="grid gap-5 @xl:grid-cols-2 @xl:gap-4">
        <section aria-labelledby="your-ranking" className="flex flex-col gap-2">
          <h3 id="your-ranking" className="font-display text-[0.95rem] font-semibold">
            Your ranking
          </h3>
          <ol className="flex flex-col gap-2">
            {ranking.map((id, index) => (
              <li
                key={id}
                className="flex min-h-13 items-center gap-2 rounded-[10px] border border-signal bg-signal-wash py-1 pr-1 pl-2 shadow-[0_0_0_1px_var(--signal)]"
              >
                <span className="font-display flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-signal text-[0.95rem] font-bold text-primary-foreground tabular-nums">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 font-medium break-words">{label.get(id)}</span>
                <Button type="button" variant="ghost" size="icon" disabled={disabled || index === 0} onClick={() => move(index, -1)} aria-label={`Move ${label.get(id)} up`}>
                  <ArrowUpIcon />
                </Button>
                <Button type="button" variant="ghost" size="icon" disabled={disabled || index === ranking.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${label.get(id)} down`}>
                  <ArrowDownIcon />
                </Button>
                <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => remove(index)} aria-label={`Remove ${label.get(id)} from ranking`}>
                  <XIcon />
                </Button>
              </li>
            ))}
            {Array.from({ length: size - ranking.length }, (_, index) => (
              <li
                key={`empty-${index}`}
                aria-hidden
                className="flex min-h-13 items-center gap-2 rounded-[10px] border border-dashed border-input px-2 text-sm text-muted-foreground"
              >
                <span className="font-display flex size-8 items-center justify-center rounded-[8px] bg-muted font-bold tabular-nums">
                  {ranking.length + index + 1}
                </span>
                {index === 0 ? "Tap an option" : ""}
              </li>
            ))}
          </ol>
        </section>

        {unranked.length > 0 && (
          <section aria-labelledby="to-rank" className="flex flex-col gap-2">
            <h3 id="to-rank" className="font-display text-[0.95rem] font-semibold">
              {full ? "Not ranked" : "Options"}
            </h3>
            <ul className="flex flex-col gap-2">
              {unranked.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => add(option.id)}
                    disabled={disabled || full}
                    className="group flex min-h-13 w-full items-center gap-3 rounded-[10px] border bg-panel px-3 py-2.5 text-left transition-colors outline-none hover:border-input hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-dashed border-input text-muted-foreground group-hover:border-signal group-hover:text-signal">
                      <PlusIcon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 font-medium break-words">{option.label}</span>
                    {newOptionIds.has(option.id) && <NewOptionBadge />}
                    {!full && <span className="sr-only">, rank {ranking.length + 1}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <FieldError errors={error?.map((message) => ({ message }))} />
    </div>
  );
}

function RankingAnswerSummary({ options, rows }: AnswerSummaryProps) {
  const label = new Map(options.map((option) => [option.id, option.label]));
  return (
    <ol className="flex flex-col gap-1.5">
      {[...rows]
        .sort((a, b) => a.value - b.value)
        .map((row) => (
          <li key={row.optionId} className="flex gap-2">
            <span className="w-5 shrink-0 text-muted-foreground tabular-nums">{row.value}.</span>
            <span className="break-words">{label.get(row.optionId)}</span>
          </li>
        ))}
    </ol>
  );
}

export const rankingVoteUI: PollTypeVoteUI = {
  emptyAnswers: () => ({ ranking: [] }),
  progress: (value, options, config) =>
    `${(value as RankingAnswers).ranking.length} of ${ballotSize(rankingConfigSchema.parse(config), options.length)} ranked`,
  VoteInput: RankingVoteInput,
  AnswerSummary: RankingAnswerSummary,
};
