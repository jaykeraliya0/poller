import { z } from "zod";
import { formatShortSlot, formatSlotLabel, isValidTimeZone } from "@/lib/datetime";
import { POLL_LIMITS } from "@/lib/validation/poll";
import { definePollType } from "../types";
import { optionIdSchema } from "../shared";
import { computeAvailabilityInsights, type AvailabilityInsights } from "./insights";

const Availability = { NO: 0, MAYBE: 1, YES: 2 } as const;
export type AvailabilityValue = (typeof Availability)[keyof typeof Availability];

export const availabilityConfigSchema = z.object({
  timezone: z.string().refine(isValidTimeZone, { error: "Unknown time zone" }),
});

export type AvailabilityConfig = z.output<typeof availabilityConfigSchema>;

const slotSchema = z
  .object({
    /** Existing slot when editing; the service keeps its stored times. */
    id: z.string().optional(),
    startsAt: z.coerce.date({ error: "Pick a start time" }),
    endsAt: z.coerce.date({ error: "Pick an end time" }),
  })
  .refine((slot) => slot.endsAt > slot.startsAt, {
    error: "End must be after start",
    path: ["endsAt"],
  })
  // Existing slots may have passed already; only new ones must be in the future.
  .refine((slot) => slot.id !== undefined || slot.startsAt.getTime() > Date.now(), {
    error: "This time slot is in the past",
    path: ["startsAt"],
  });

const slotsSchema = z
  .array(slotSchema)
  .min(POLL_LIMITS.optionsMin, `Add at least ${POLL_LIMITS.optionsMin} time slots`)
  .max(POLL_LIMITS.slotsMax, `Up to ${POLL_LIMITS.slotsMax} time slots`)
  .superRefine((slots, ctx) => {
    const seen = new Set<string>();
    slots.forEach((slot, index) => {
      const key = `${slot.startsAt.getTime()}-${slot.endsAt.getTime()}`;
      if (seen.has(key)) {
        ctx.addIssue({ code: "custom", message: "Duplicate time slot", path: [index, "startsAt"] });
      }
      seen.add(key);
    });
  });

const setupSchema = z
  .object({ config: availabilityConfigSchema, options: slotsSchema })
  .transform(({ config, options }) => ({
    config: { timezone: config.timezone },
    // Slots are always stored chronologically; labels use the poll's time zone.
    options: [...options]
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .map((slot, position) => ({
        ...(slot.id && { id: slot.id }),
        label: formatSlotLabel(slot.startsAt, slot.endsAt, config.timezone),
        position,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      })),
  }));

export type AvailabilityAnswers = { availability: Record<string, AvailabilityValue> };

const valueSchema = z.union([z.literal(0), z.literal(1), z.literal(2)], {
  error: "Choose yes, if need be, or no",
});

export const availabilityPollType = definePollType<AvailabilityAnswers, AvailabilityInsights>({
  type: "AVAILABILITY",
  label: "Find a time",
  description: "Everyone marks which time slots work for them.",
  setupSchema,

  answersSchema({ options }) {
    const optionIds = new Set(options.map((option) => option.id));
    return z
      .object({ availability: z.record(optionIdSchema(optionIds), valueSchema) })
      .refine(({ availability }) => [...optionIds].every((id) => id in availability), {
        error: "Answer every time slot",
        path: ["availability"],
      })
      .transform(({ availability }) =>
        Object.entries(availability).map(([optionId, value]) => ({ optionId, value })),
      );
  },

  toAnswerInput(rows) {
    return {
      availability: Object.fromEntries(
        rows.map((row) => [row.optionId, row.value as AvailabilityValue]),
      ),
    };
  },

  computeInsights(ctx) {
    return computeAvailabilityInsights(ctx, availabilityConfigSchema.parse(ctx.poll.config));
  },

  csvValue(value) {
    return value === undefined ? "" : (["No", "If need be", "Yes"][value] ?? "");
  },

  summarizeAnswers(rows, { config, options }) {
    const { timezone } = availabilityConfigSchema.parse(config);
    const value = new Map(rows.map((row) => [row.optionId, row.value]));
    const slotsWith = (target: number) =>
      options
        .filter((option) => option.startsAt && value.get(option.id) === target)
        .map((option) => formatShortSlot(option.startsAt!, timezone));
    const parts = [
      ["Yes", slotsWith(Availability.YES)],
      ["If need be", slotsWith(Availability.MAYBE)],
    ] as const;
    const text = parts
      .filter(([, slots]) => slots.length > 0)
      .map(([label, slots]) => `${label}: ${slots.join(", ")}`)
      .join(" · ");
    return text || "None of these times";
  },
});
