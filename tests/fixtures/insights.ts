import type {
  InsightContext,
  InsightOption,
  InsightPoll,
  InsightResponse,
} from "@/lib/insights/types";

const NOW = new Date("2026-09-22T12:00:00Z");

export function makePoll(overrides: Partial<InsightPoll> = {}): InsightPoll {
  return {
    type: "CHOICE",
    config: { multi: false, maxSelections: null },
    isAnonymous: false,
    expectedParticipants: null,
    closesAt: null,
    closedAt: null,
    createdAt: new Date("2026-09-20T09:00:00Z"),
    ...overrides,
  };
}

export function makeOptions(labels: string[]): InsightOption[] {
  return labels.map((label, position) => ({
    id: `opt-${position + 1}`,
    label,
    position,
    startsAt: null,
    endsAt: null,
    createdAt: new Date("2026-09-20T09:00:00Z"),
  }));
}

let responseSeq = 0;

export function makeResponse(
  answers: Record<string, number>,
  overrides: Partial<InsightResponse> = {},
): InsightResponse {
  responseSeq += 1;
  const createdAt = overrides.createdAt ?? new Date("2026-09-21T10:00:00Z");
  return {
    id: `resp-${responseSeq}`,
    voterName: `Voter ${responseSeq}`,
    comment: null,
    createdAt,
    updatedAt: createdAt,
    answers: Object.entries(answers).map(([optionId, value]) => ({ optionId, value })),
    ...overrides,
  };
}

/** Choice votes: each entry is the list of option ids one voter picked. */
export function choiceVotes(...picks: string[][]): InsightResponse[] {
  return picks.map((ids) => makeResponse(Object.fromEntries(ids.map((id) => [id, 1]))));
}

export function makeContext(overrides: Partial<InsightContext> = {}): InsightContext {
  return {
    poll: makePoll(),
    options: makeOptions(["Pizza", "Sushi", "Tacos"]),
    responses: [],
    now: NOW,
    ...overrides,
  };
}
