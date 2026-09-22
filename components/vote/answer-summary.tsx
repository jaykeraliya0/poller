"use client";

import type { PollType } from "@/generated/prisma/enums";
import { getPollTypeVoteUI } from "@/poll-types/vote-inputs";
import type { AnswerSummaryProps } from "@/poll-types/vote-types";

/**
 * Server pages can't reach into the client-side registry object (only a client
 * module's top-level exports cross the boundary), so the lookup happens here.
 */
export function AnswerSummary({ type, ...props }: AnswerSummaryProps & { type: PollType }) {
  const ui = getPollTypeVoteUI(type);
  return <ui.AnswerSummary {...props} />;
}
