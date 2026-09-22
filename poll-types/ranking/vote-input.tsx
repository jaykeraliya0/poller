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
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        {size === options.length
          ? "Tap the options in order of preference, favourite first."
          : `Tap your top ${size} in order of preference, favourite first.`}
      </p>

      <section aria-labelledby="your-ranking" className="flex flex-col gap-2">
        <h3 id="your-ranking" className="text-sm font-medium">
          Your ranking
        </h3>
        <ol className="flex flex-col gap-2">
          {ranking.map((id, index) => (
            <li key={id} className="flex min-h-14 items-center gap-2 rounded-2xl border border-primary bg-primary/5 py-1 pr-1 pl-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular-nums">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 break-words">{label.get(id)}</span>
              <Button type="button" variant="ghost" size="icon-lg" disabled={disabled || index === 0} onClick={() => move(index, -1)} aria-label={`Move ${label.get(id)} up`}>
                <ArrowUpIcon />
              </Button>
              <Button type="button" variant="ghost" size="icon-lg" disabled={disabled || index === ranking.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${label.get(id)} down`}>
                <ArrowDownIcon />
              </Button>
              <Button type="button" variant="ghost" size="icon-lg" disabled={disabled} onClick={() => remove(index)} aria-label={`Remove ${label.get(id)} from ranking`}>
                <XIcon />
              </Button>
            </li>
          ))}
          {Array.from({ length: size - ranking.length }, (_, index) => (
            <li
              key={`empty-${index}`}
              aria-hidden
              className="flex min-h-14 items-center gap-2 rounded-2xl border border-dashed px-3 text-sm text-muted-foreground"
            >
              <span className="flex size-7 items-center justify-center rounded-full border tabular-nums">{ranking.length + index + 1}</span>
              {index === 0 ? "Tap an option below" : ""}
            </li>
          ))}
        </ol>
      </section>

      {unranked.length > 0 && (
        <section aria-labelledby="to-rank" className="flex flex-col gap-2">
          <h3 id="to-rank" className="text-sm font-medium">
            {full ? "Not ranked" : "Options"}
          </h3>
          <ul className="flex flex-col gap-2">
            {unranked.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => add(option.id)}
                  disabled={disabled || full}
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PlusIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 break-words">{option.label}</span>
                  {newOptionIds.has(option.id) && <NewOptionBadge />}
                  {!full && <span className="sr-only">, rank {ranking.length + 1}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

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
