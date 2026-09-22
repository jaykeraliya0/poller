"use client";

import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { PlusIcon, XIcon } from "lucide-react";
import { FieldShell } from "@/components/forms/field-shell";
import { NativeSelect } from "@/components/forms/native-select";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatDay, formatTime, zonedDateTime } from "@/lib/datetime";
import { draftKey } from "@/lib/draft-key";
import { POLL_LIMITS } from "@/lib/validation/poll";
import type { PollTypeEditor, TypeEditorProps } from "../editor-types";
import type { AvailabilityConfig } from "./definition";

/** Wall-clock slot in the poll's time zone; converted to instants on submit. */
export type SlotDraft = { key: string; date: string; time: string; durationMin: number };

const DURATIONS = [30, 60, 90, 120, 180, 240];
const MINUTE = 60_000;

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function timeZones(current: string): string[] {
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return zones.includes(current) ? zones : [current, ...zones];
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest ? `${hours}h ${rest}m` : `${hours} hour${hours > 1 ? "s" : ""}`;
}

/** Treats the wall-clock values as UTC purely for display; no zone maths. */
function wallClock(slot: SlotDraft) {
  const start = new Date(`${slot.date}T${slot.time}:00Z`);
  const end = new Date(start.getTime() + slot.durationMin * MINUTE);
  return { start, end, valid: !Number.isNaN(start.getTime()) };
}

function describeSlot(slot: SlotDraft) {
  const { start, end, valid } = wallClock(slot);
  if (!valid) return "Invalid time";
  const nextDay = start.toISOString().slice(0, 10) !== end.toISOString().slice(0, 10);
  return `${formatTime(start, "UTC")} – ${formatTime(end, "UTC")}${nextDay ? " (+1 day)" : ""}`;
}

const sortKey = (slot: SlotDraft) => `${slot.date}T${slot.time}`;

function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const total = Math.min(hours * 60 + mins + minutes, 23 * 60 + 30);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function TimeZoneField({ config, onConfigChange, errors }: TypeEditorProps) {
  const { timezone } = config as AvailabilityConfig;
  const zones = useMemo(() => timeZones(timezone), [timezone]);
  return (
    <FieldShell
      label="Time zone"
      description="Slots are shown in this zone, with each voter's local time alongside."
      errors={errors["config.timezone"]}
    >
      {(control) => (
        <NativeSelect {...control} value={timezone} onChange={(event) => onConfigChange({ timezone: event.target.value })}>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </NativeSelect>
      )}
    </FieldShell>
  );
}

function SlotPicker({ options, onOptionsChange, errors }: TypeEditorProps) {
  const slots = options as SlotDraft[];
  const [date, setDate] = useState(() => format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [time, setTime] = useState("18:00");
  const [durationMin, setDurationMin] = useState(60);
  const [addError, setAddError] = useState<string | null>(null);

  const atLimit = slots.length >= POLL_LIMITS.slotsMax;

  const addSlot = () => {
    if (!date || !time) return setAddError("Pick a date and start time.");
    if (slots.some((slot) => slot.date === date && slot.time === time && slot.durationMin === durationMin)) {
      return setAddError("You've already added this slot.");
    }
    setAddError(null);
    onOptionsChange([...slots, { key: draftKey(), date, time, durationMin }]);
    // Next slot defaults to right after this one, for quick back-to-back entry.
    setTime(addMinutesToTime(time, durationMin));
  };

  const removeSlot = (key: string) => onOptionsChange(slots.filter((slot) => slot.key !== key));

  // Display grouped by day, but keep each slot's original index for error paths.
  const days = useMemo(() => {
    const groups = new Map<string, { slot: SlotDraft; index: number }[]>();
    slots
      .map((slot, index) => ({ slot, index }))
      .sort((a, b) => sortKey(a.slot).localeCompare(sortKey(b.slot)))
      .forEach((entry) => {
        const group = groups.get(entry.slot.date) ?? [];
        group.push(entry);
        groups.set(entry.slot.date, group);
      });
    return [...groups.entries()];
  }, [slots]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-dashed p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <FieldShell label="Date" className="col-span-2 sm:col-span-1">
          {(control) => (
            <Input {...control} type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11" />
          )}
        </FieldShell>
        <FieldShell label="Start">
          {(control) => (
            <Input {...control} type="time" step={900} value={time} onChange={(event) => setTime(event.target.value)} className="h-11" />
          )}
        </FieldShell>
        <FieldShell label="Length">
          {(control) => (
            <NativeSelect {...control} value={durationMin} onChange={(event) => setDurationMin(Number(event.target.value))}>
              {DURATIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {formatDuration(minutes)}
                </option>
              ))}
            </NativeSelect>
          )}
        </FieldShell>
        <Button type="button" size="lg" onClick={addSlot} disabled={atLimit} className="col-span-2 h-11 sm:col-span-1">
          <PlusIcon data-icon="inline-start" />
          Add slot
        </Button>
        {addError && <FieldError className="col-span-2 sm:col-span-4">{addError}</FieldError>}
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No time slots yet. Add at least two options for people to choose from.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map(([day, entries]) => (
            <section key={day} aria-label={formatDay(new Date(`${day}T12:00:00Z`), "UTC")}>
              <h3 className="mb-2 text-sm font-medium">{formatDay(new Date(`${day}T12:00:00Z`), "UTC")}</h3>
              <ul className="flex flex-col gap-2">
                {entries.map(({ slot, index }) => {
                  const slotErrors = [
                    ...(errors[`options.${index}.startsAt`] ?? []),
                    ...(errors[`options.${index}.endsAt`] ?? []),
                  ];
                  return (
                    <li key={slot.key} className="flex flex-col gap-1">
                      <div
                        className="flex items-center justify-between gap-2 rounded-2xl bg-muted/60 py-1 pr-1 pl-3 data-invalid:ring-2 data-invalid:ring-destructive/40"
                        data-invalid={slotErrors.length ? "" : undefined}
                      >
                        <span className="text-sm tabular-nums">
                          {describeSlot(slot)}
                          <span className="ml-2 text-xs text-muted-foreground">{formatDuration(slot.durationMin)}</span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-lg"
                          onClick={() => removeSlot(slot.key)}
                          aria-label={`Remove ${formatDay(new Date(`${day}T12:00:00Z`), "UTC")} ${describeSlot(slot)}`}
                        >
                          <XIcon />
                        </Button>
                      </div>
                      <FieldError errors={slotErrors.map((message) => ({ message }))} />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <FieldError errors={errors.options?.map((message) => ({ message }))} />
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {slots.length}/{POLL_LIMITS.slotsMax}
        </span>
      </div>
    </div>
  );
}

export const availabilityEditor: PollTypeEditor = {
  optionKind: "slot",
  sectionTitle: "Time slots",
  sectionDescription: "Add the dates and times people can choose from.",
  defaultConfig: () => ({ timezone: browserTimeZone() }),
  initialOptions: () => [],
  toSubmission: (config, options) => {
    const { timezone } = config as AvailabilityConfig;
    return {
      config,
      options: (options as SlotDraft[]).map((slot) => {
        const start = zonedDateTime(slot.date, slot.time, timezone);
        if (!start) return { startsAt: "", endsAt: "" };
        return {
          startsAt: start.toISOString(),
          endsAt: new Date(start.getTime() + slot.durationMin * MINUTE).toISOString(),
        };
      }),
    };
  },
  ConfigFields: TimeZoneField,
  OptionsEditor: SlotPicker,
};
