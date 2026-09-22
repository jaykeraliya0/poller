import { format } from "date-fns";
import { tz } from "@date-fns/tz";

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function inZone(timeZone: string) {
  return { in: tz(timeZone) };
}

/** "6pm" or "6:30pm". */
export function formatTime(date: Date, timeZone: string): string {
  const onTheHour = format(date, "m", inZone(timeZone)) === "0";
  return format(date, onTheHour ? "haaa" : "h:mmaaa", inZone(timeZone));
}

/** Stable key for grouping slots by calendar day in the poll's time zone. */
export function dayKey(date: Date, timeZone: string): string {
  return format(date, "yyyy-MM-dd", inZone(timeZone));
}

/** "Fri 26 Sep" */
export function formatDay(date: Date, timeZone: string): string {
  return format(date, "EEE d MMM", inZone(timeZone));
}

/** "Fri 6pm", used in insight sentences. */
export function formatShortSlot(start: Date, timeZone: string): string {
  return `${format(start, "EEE", inZone(timeZone))} ${formatTime(start, timeZone)}`;
}

/** "Fri 26 Sep, 6pm – 7:30pm", or with both dates when the slot spans midnight. */
export function formatSlotLabel(start: Date, end: Date, timeZone: string): string {
  const startText = `${formatDay(start, timeZone)}, ${formatTime(start, timeZone)}`;
  const endText =
    dayKey(start, timeZone) === dayKey(end, timeZone)
      ? formatTime(end, timeZone)
      : `${formatDay(end, timeZone)}, ${formatTime(end, timeZone)}`;
  return `${startText} – ${endText}`;
}

/** UTC calendar day, used for response timelines. */
export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
