import type { PollType } from "@/generated/prisma/enums";
import { availabilityVoteUI } from "./availability/vote-input";
import { choiceVoteUI } from "./choice/vote-input";
import { rankingVoteUI } from "./ranking/vote-input";
import { ratingVoteUI } from "./rating/vote-input";
import type { PollTypeVoteUI } from "./vote-types";

const voteUIs: Record<PollType, PollTypeVoteUI> = {
  CHOICE: choiceVoteUI,
  AVAILABILITY: availabilityVoteUI,
  RANKING: rankingVoteUI,
  RATING: ratingVoteUI,
};

export function getPollTypeVoteUI(type: PollType): PollTypeVoteUI {
  return voteUIs[type];
}
