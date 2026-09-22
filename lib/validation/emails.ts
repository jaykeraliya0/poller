import { z } from "zod";

export const EMAIL_LIST_LIMITS = {
  /** Emails accepted in one paste. */
  perSubmit: 50,
  invitesPerPoll: 200,
  membersPerGroup: 200,
} as const;

const emailSchema = z.email().max(254);

export type EmailListResult = { success: true; emails: string[] } | { success: false; error: string };

/**
 * Parses a pasted list of emails separated by commas, semicolons, spaces or
 * new lines. Lowercases and dedupes; any invalid entry fails the whole list
 * so nothing is half-added.
 */
export function parseEmailList(raw: unknown, max: number = EMAIL_LIST_LIMITS.perSubmit): EmailListResult {
  if (typeof raw !== "string") return { success: false, error: "Enter at least one email address" };
  const entries = raw
    .split(/[\s,;]+/)
    .map((entry) => entry.replace(/^<|>$/g, "").trim().toLowerCase())
    .filter(Boolean);
  if (entries.length === 0) return { success: false, error: "Enter at least one email address" };

  const invalid = entries.filter((entry) => !emailSchema.safeParse(entry).success);
  if (invalid.length > 0) {
    const shown = invalid.slice(0, 3).join(", ");
    return {
      success: false,
      error: `${invalid.length === 1 ? "Not a valid email" : "Not valid emails"}: ${shown}${invalid.length > 3 ? ` and ${invalid.length - 3} more` : ""}`,
    };
  }

  const emails = [...new Set(entries)];
  if (emails.length > max) return { success: false, error: `Add up to ${max} addresses at a time` };
  return { success: true, emails };
}
