import "server-only";
import { toCsv } from "@/lib/csv";
import { utcDayKey } from "@/lib/datetime";
import { getPollType } from "@/poll-types/registry";
import type { PollExport } from "./data";

/** One row per response, one column per option. Opens cleanly in Excel. */
export function buildCsv({ poll, responses }: PollExport): string {
  const definition = getPollType(poll.type);
  const header = [
    "Submitted",
    ...(poll.isAnonymous ? [] : ["Name"]),
    ...poll.options.map((option) => option.label),
    "Comment",
  ];
  const rows = responses.map((response) => {
    const values = new Map(response.answers.map((answer) => [answer.optionId, answer.value]));
    return [
      // Anonymous polls export only the day, like the comments feed.
      poll.isAnonymous ? utcDayKey(response.updatedAt) : response.updatedAt.toISOString(),
      ...(poll.isAnonymous ? [] : [response.name ?? ""]),
      ...poll.options.map((option) => definition.csvValue(values.get(option.id))),
      response.comment ?? "",
    ];
  });
  // BOM so Excel reads UTF-8 (accents, emoji) correctly.
  return `﻿${toCsv([header, ...rows])}`;
}
