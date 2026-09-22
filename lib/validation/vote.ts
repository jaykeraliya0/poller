import { z } from "zod";
import { POLL_LIMITS, optionalText } from "./poll";

/** The type-independent part of a vote; `answers` is validated by the poll type. */
export const voteEnvelopeSchema = z.object({
  slug: z.string().min(1),
  answers: z.unknown(),
  voterName: optionalText(POLL_LIMITS.voterNameMax, "Name"),
  comment: optionalText(POLL_LIMITS.commentMax, "Comment"),
});

export type VoteEnvelopeInput = z.input<typeof voteEnvelopeSchema>;
