import { dayKey, formatDay, formatShortSlot } from "@/lib/datetime";
import { decideOutcome, formatList, type Outcome, type Scored } from "@/lib/insights/outcome";
import type { InsightContext } from "@/lib/insights/types";
import type { AvailabilityConfig } from "./definition";

type SlotResult = Scored & {
  startsAt: Date;
  endsAt: Date;
  /** "Fri 6pm" in the poll's time zone. */
  shortLabel: string;
  yes: number;
  maybe: number;
  no: number;
  /** Voters who answered before this slot was added. */
  unanswered: number;
};

export type AvailabilityInsights = {
  kind: "AVAILABILITY";
  timezone: string;
  /** Chronological. */
  slots: SlotResult[];
  days: { key: string; label: string; slotIds: string[] }[];
  outcome: Outcome<SlotResult>;
  headline: string | null;
};

export function computeAvailabilityInsights(
  ctx: InsightContext,
  config: AvailabilityConfig,
): AvailabilityInsights {
  const { timezone } = config;
  const total = ctx.responses.length;

  const tallies = new Map<string, { yes: number; maybe: number; no: number }>();
  for (const response of ctx.responses) {
    for (const answer of response.answers) {
      const tally = tallies.get(answer.optionId) ?? { yes: 0, maybe: 0, no: 0 };
      if (answer.value === 2) tally.yes++;
      else if (answer.value === 1) tally.maybe++;
      else tally.no++;
      tallies.set(answer.optionId, tally);
    }
  }

  const slots = ctx.options
    .filter((option) => option.startsAt && option.endsAt)
    .sort((a, b) => a.startsAt!.getTime() - b.startsAt!.getTime())
    .map<SlotResult>((option) => {
      const { yes, maybe, no } = tallies.get(option.id) ?? { yes: 0, maybe: 0, no: 0 };
      return {
        optionId: option.id,
        label: option.label,
        startsAt: option.startsAt!,
        endsAt: option.endsAt!,
        shortLabel: formatShortSlot(option.startsAt!, timezone),
        yes,
        maybe,
        no,
        unanswered: total - yes - maybe - no,
        // "Yes" always outranks any number of "if need be"s.
        score: yes * (total + 1) + maybe,
      };
    });

  const days: AvailabilityInsights["days"] = [];
  for (const slot of slots) {
    const key = dayKey(slot.startsAt, timezone);
    let day = days.at(-1);
    if (day?.key !== key) {
      day = { key, label: formatDay(slot.startsAt, timezone), slotIds: [] };
      days.push(day);
    }
    day.slotIds.push(slot.optionId);
  }

  const outcome = decideOutcome(slots, total);
  return { kind: "AVAILABILITY", timezone, slots, days, outcome, headline: headline(outcome, total) };
}

function worksFor(slot: SlotResult, total: number): string {
  const who = slot.yes === total ? `everyone (${total}/${total})` : `${slot.yes}/${total} people`;
  return slot.maybe > 0 ? `${who} (+${slot.maybe} if need be)` : who;
}

function headline(outcome: Outcome<SlotResult>, total: number): string | null {
  switch (outcome.kind) {
    case "LEADER": {
      const { leader } = outcome;
      if (leader.yes === 0) return `${leader.shortLabel} works for ${leader.maybe}/${total} if need be`;
      return `${leader.shortLabel} works for ${worksFor(leader, total)}`;
    }
    case "TIE": {
      const [first] = outcome.tied;
      const labels = formatList(outcome.tied.map((slot) => slot.shortLabel));
      return `${labels} each work for ${worksFor(first, total)}`;
    }
    case "NO_SUPPORT":
      return "None of the time slots work for anyone yet";
    default:
      return null;
  }
}
