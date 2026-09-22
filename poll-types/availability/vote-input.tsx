"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { CheckIcon, MinusIcon, XIcon, type LucideIcon } from "lucide-react";
import { NewOptionBadge } from "@/components/vote/new-option-badge";
import { FieldError } from "@/components/ui/field";
import { useBrowserTimeZone } from "@/hooks/use-browser-time-zone";
import { dayKey, formatDay, formatTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { AnswerSummaryProps, PollTypeVoteUI, VoteInputProps, VoteOption } from "../vote-types";
import { availabilityConfigSchema, type AvailabilityAnswers, type AvailabilityValue } from "./definition";

type Choice = { value: AvailabilityValue; label: string; icon: LucideIcon; checkedClass: string };

// Text and icon on every choice, so colour is never the only signal.
const CHOICES: Choice[] = [
  { value: 2, label: "Yes", icon: CheckIcon, checkedClass: "data-checked:bg-emerald-600 data-checked:text-white" },
  { value: 1, label: "If need be", icon: MinusIcon, checkedClass: "data-checked:bg-amber-500 data-checked:text-white" },
  { value: 0, label: "No", icon: XIcon, checkedClass: "data-checked:bg-muted-foreground data-checked:text-background" },
];

const timeRange = (option: VoteOption, timeZone: string) =>
  `${formatTime(option.startsAt!, timeZone)} – ${formatTime(option.endsAt!, timeZone)}`;

/** Slots grouped by calendar day in the poll's time zone. */
function groupByDay(options: VoteOption[], timeZone: string) {
  const days: { key: string; label: string; slots: VoteOption[] }[] = [];
  for (const option of options) {
    if (!option.startsAt || !option.endsAt) continue;
    const key = dayKey(option.startsAt, timeZone);
    let day = days.at(-1);
    if (day?.key !== key) {
      day = { key, label: formatDay(option.startsAt, timeZone), slots: [] };
      days.push(day);
    }
    day.slots.push(option);
  }
  return days;
}

function LocalTime({ option, pollTimeZone }: { option: VoteOption; pollTimeZone: string }) {
  const browserTimeZone = useBrowserTimeZone();
  if (!browserTimeZone || browserTimeZone === pollTimeZone) return null;
  const sameDay = dayKey(option.startsAt!, browserTimeZone) === dayKey(option.startsAt!, pollTimeZone);
  return (
    <span className="text-xs text-muted-foreground">
      {sameDay ? "" : `${formatDay(option.startsAt!, browserTimeZone)}, `}
      {timeRange(option, browserTimeZone)} your time
    </span>
  );
}

function AvailabilityVoteInput({ config, options, value, onChange, errors, newOptionIds, disabled }: VoteInputProps) {
  const { timezone } = availabilityConfigSchema.parse(config);
  const answers = (value as AvailabilityAnswers).availability;
  const days = groupByDay(options, timezone);
  const error = errors["answers.availability"] ?? errors.answers;

  const set = (optionId: string, next: AvailabilityValue) =>
    onChange({ availability: { ...answers, [optionId]: next } });

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">Times are in {timezone.replaceAll("_", " ")}.</p>
      {days.map((day) => (
        <section key={day.key} aria-labelledby={`day-${day.key}`} className="flex flex-col gap-2">
          <h3 id={`day-${day.key}`} className="text-sm font-medium">
            {day.label}
          </h3>
          {day.slots.map((option) => {
            const slotLabel = `${day.label}, ${timeRange(option, timezone)}`;
            const unanswered = error && answers[option.id] === undefined;
            return (
              <div
                key={option.id}
                data-invalid={unanswered ? "" : undefined}
                className="flex flex-col gap-2 rounded-2xl border bg-card p-3 data-invalid:border-destructive/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-start sm:gap-0.5">
                  <span className="font-medium tabular-nums">{timeRange(option, timezone)}</span>
                  <LocalTime option={option} pollTimeZone={timezone} />
                  {newOptionIds.has(option.id) && <NewOptionBadge />}
                </div>
                <RadioGroup
                  aria-label={slotLabel}
                  value={answers[option.id] ?? null}
                  onValueChange={(next) => set(option.id, next as AvailabilityValue)}
                  disabled={disabled}
                  className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1 sm:w-80"
                >
                  {CHOICES.map((choice) => (
                    <Radio.Root
                      key={choice.value}
                      value={choice.value}
                      className={cn(
                        "flex h-10 items-center justify-center gap-1 rounded-xl px-2 text-sm font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 data-disabled:opacity-60",
                        choice.checkedClass,
                      )}
                    >
                      <choice.icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{choice.label}</span>
                    </Radio.Root>
                  ))}
                </RadioGroup>
              </div>
            );
          })}
        </section>
      ))}
      <FieldError errors={error?.map((message) => ({ message }))} />
    </div>
  );
}

function AvailabilityAnswerSummary({ config, options, rows }: AnswerSummaryProps) {
  const { timezone } = availabilityConfigSchema.parse(config);
  const byOption = new Map(rows.map((row) => [row.optionId, row.value]));
  return (
    <ul className="flex flex-col gap-1.5">
      {options.map((option) => {
        const choice = CHOICES.find((c) => c.value === byOption.get(option.id));
        return (
          <li key={option.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="tabular-nums">
              {formatDay(option.startsAt!, timezone)}, {timeRange(option, timezone)}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              {choice ? <choice.icon className="size-4" aria-hidden /> : null}
              {choice?.label ?? "Not answered"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export const availabilityVoteUI: PollTypeVoteUI = {
  emptyAnswers: () => ({ availability: {} }),
  progress: (value, options) => {
    const answered = Object.keys((value as AvailabilityAnswers).availability).length;
    return `${answered} of ${options.length} slots answered`;
  },
  VoteInput: AvailabilityVoteInput,
  AnswerSummary: AvailabilityAnswerSummary,
};
