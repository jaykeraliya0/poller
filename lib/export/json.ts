import "server-only";
import { utcDayKey } from "@/lib/datetime";
import { getPollStatus } from "@/lib/poll/status";
import { getPollType } from "@/poll-types/registry";
import type { PollExport } from "./data";

/** Bump when a field changes meaning or goes away, so scripts reading exports can tell. */
const EXPORT_VERSION = 1;

/**
 * The whole poll as structured data: settings, options, every response with
 * labelled answers, and the computed insights. Anonymous polls leave out names
 * and exact times, the same as every other view of them.
 */
export function buildJson({ poll, typeLabel, url, responses, insights, generatedAt }: PollExport): string {
  const definition = getPollType(poll.type);
  const labels = new Map(poll.options.map((option) => [option.id, option.label]));

  const document = {
    format: "poller.poll-export",
    version: EXPORT_VERSION,
    exportedAt: generatedAt,
    poll: {
      id: poll.id,
      url,
      title: poll.title,
      description: poll.description,
      type: poll.type,
      typeLabel,
      template: poll.template,
      config: poll.config,
      status: getPollStatus(poll, generatedAt),
      visibility: poll.visibility,
      resultsVisibility: poll.resultsVisibility,
      isAnonymous: poll.isAnonymous,
      allowVoteChange: poll.allowVoteChange,
      requireLogin: poll.requireLogin,
      expectedParticipants: poll.expectedParticipants,
      createdBy: poll.creator.name,
      createdAt: poll.createdAt,
      closesAt: poll.closesAt,
      closedAt: poll.closedAt,
      archivedAt: poll.archivedAt,
    },
    options: poll.options.map((option) => ({
      id: option.id,
      label: option.label,
      position: option.position,
      startsAt: option.startsAt,
      endsAt: option.endsAt,
      addedAt: option.createdAt,
    })),
    responses: responses.map((response) => ({
      id: response.id,
      ...(poll.isAnonymous
        ? { submittedOn: utcDayKey(response.updatedAt) }
        : { name: response.name, submittedAt: response.createdAt, updatedAt: response.updatedAt }),
      comment: response.comment,
      summary: response.summary,
      answers: response.answers.map((answer) => ({
        optionId: answer.optionId,
        option: labels.get(answer.optionId) ?? null,
        value: answer.value,
        display: definition.csvValue(answer.value),
      })),
    })),
    insights,
  };
  return JSON.stringify(document, null, 2);
}
