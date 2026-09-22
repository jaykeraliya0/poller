"use client";

import { CheckIcon, EyeIcon, MinusIcon, PlusIcon, XIcon } from "lucide-react";
import type { PollType } from "@/generated/prisma/enums";
import { dayKey, formatDay, formatTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type BallotPreviewProps = {
  type: PollType;
  title: string;
  description: string;
  /** What the setup schema validates: `{ config, options }` in submission shape. */
  config: unknown;
  options: unknown[];
};

/**
 * Text drawn by CSS (`content: attr()`), not DOM text. The preview is a picture
 * of the ballot: it must never answer text or label queries meant for the form.
 */
function T({ text, className }: { text: string; className?: string }) {
  return <span data-t={text} className={cn("before:content-[attr(data-t)]", className)} />;
}

type Config = {
  multi?: boolean;
  maxSelections?: number | null;
  rankTop?: number | null;
  scale?: number;
  lowLabel?: string;
  highLabel?: string;
  timezone?: string;
};

const row = "flex min-h-11 items-center gap-2.5 rounded-[9px] border bg-panel px-3 py-2 text-sm font-medium";

function labels(options: unknown[]) {
  return options.map((raw) => (raw as { label?: string }).label?.trim() || "…");
}

function ChoicePreview({ config, options }: { config: Config; options: unknown[] }) {
  return (
    <div className="flex flex-col gap-2">
      <T
        className="text-xs text-muted-foreground"
        text={config.multi ? (config.maxSelections ? `Pick up to ${config.maxSelections}.` : "Pick as many as you like.") : "Pick one."}
      />
      {labels(options).map((label, index) => (
        <div key={index} className={row}>
          <span className={cn("size-4 shrink-0 border border-input bg-muted", config.multi ? "rounded-[5px]" : "rounded-full")} />
          <T text={label} className="break-words" />
        </div>
      ))}
    </div>
  );
}

function RankingPreview({ config, options }: { config: Config; options: unknown[] }) {
  const all = labels(options);
  const size = Math.min(config.rankTop || all.length, all.length);
  return (
    <div className="flex flex-col gap-2">
      <T className="text-xs text-muted-foreground" text={`Tap your top ${size} in order of preference, favourite first.`} />
      {Array.from({ length: size }, (_, index) => (
        <div key={`slot-${index}`} className="flex min-h-10 items-center gap-2 rounded-[9px] border border-dashed border-input px-2">
          <T text={String(index + 1)} className="font-display flex size-6 items-center justify-center rounded-[6px] bg-muted text-xs font-bold" />
        </div>
      ))}
      {all.map((label, index) => (
        <div key={index} className={row}>
          <PlusIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <T text={label} className="break-words" />
        </div>
      ))}
    </div>
  );
}

function RatingPreview({ config, options }: { config: Config; options: unknown[] }) {
  const scale = config.scale === 10 ? 10 : 5;
  return (
    <div className="flex flex-col gap-2">
      {labels(options).map((label, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-[9px] border bg-panel p-2.5">
          <T text={label} className="text-sm font-medium break-words" />
          <div className={cn("grid gap-0.5 rounded-[7px] bg-muted p-0.5", scale === 5 ? "grid-cols-5" : "grid-cols-10")}>
            {Array.from({ length: scale }, (_, score) => (
              <T key={score} text={String(score + 1)} className="flex h-6 items-center justify-center text-[0.6875rem] font-semibold text-muted-foreground" />
            ))}
          </div>
          <div className="flex justify-between text-[0.625rem] text-muted-foreground">
            <T text={config.lowLabel ?? ""} />
            <T text={config.highLabel ?? ""} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AvailabilityPreview({ config, options }: { config: Config; options: unknown[] }) {
  const timeZone = config.timezone ?? "UTC";
  const slots = options
    .map((raw) => {
      const option = raw as { startsAt?: string; endsAt?: string };
      return { start: new Date(option.startsAt ?? ""), end: new Date(option.endsAt ?? "") };
    })
    .filter(({ start, end }) => !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  if (slots.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <T className="text-xs text-muted-foreground" text={`Times are in ${timeZone.replaceAll("_", " ")}.`} />
      {slots.map(({ start, end }, index) => {
        // A day heading above the first slot of each day.
        const firstOfDay = index === 0 || dayKey(slots[index - 1].start, timeZone) !== dayKey(start, timeZone);
        const heading = firstOfDay ? formatDay(start, timeZone) : null;
        return (
          <div key={index} className="flex flex-col gap-1.5">
            {heading && <T text={heading} className="font-display mt-1 text-sm font-semibold" />}
            <div className="flex flex-col gap-1.5 rounded-[9px] border bg-panel p-2">
              <T text={`${formatTime(start, timeZone)} – ${formatTime(end, timeZone)}`} className="px-1 text-sm font-medium tabular-nums" />
              <div className="grid grid-cols-3 gap-0.5 rounded-[7px] bg-muted p-0.5 text-muted-foreground">
                {[CheckIcon, MinusIcon, XIcon].map((Icon, choice) => (
                  <span key={choice} className="flex h-6 items-center justify-center">
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** What voters will see, redrawn as the organiser types. A picture only: inert and hidden from assistive tech. */
export function BallotPreview({ type, title, description, config, options }: BallotPreviewProps) {
  const settings = (config ?? {}) as Config;
  const body =
    options.length === 0 ? null : type === "AVAILABILITY" ? (
      <AvailabilityPreview config={settings} options={options} />
    ) : type === "RANKING" ? (
      <RankingPreview config={settings} options={options} />
    ) : type === "RATING" ? (
      <RatingPreview config={settings} options={options} />
    ) : (
      <ChoicePreview config={settings} options={options} />
    );

  return (
    <div className="panel flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2.5 text-xs font-medium text-muted-foreground" aria-hidden>
        <EyeIcon className="size-3.5" aria-hidden />
        <T text="What voters see" />
      </div>
      <div inert aria-hidden className="flex max-h-[min(34rem,calc(100dvh-16rem))] flex-col gap-4 overflow-y-auto p-4 select-none">
        <div className="flex flex-col gap-1">
          <T text={title.trim() || "Your question"} className="font-display text-xl leading-tight font-bold break-words" />
          {description.trim() && <T text={description} className="text-sm whitespace-pre-line text-muted-foreground" />}
        </div>
        {body ?? (
          <div className="rounded-[10px] border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            <T text="Options you add appear here." />
          </div>
        )}
      </div>
    </div>
  );
}
