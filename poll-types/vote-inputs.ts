import type { PollType } from "@/generated/prisma/enums";
import { availabilityVoteUI } from "./availability/vote-input";
import { choiceVoteUI } from "./choice/vote-input";
import type { PollTypeVoteUI } from "./vote-types";

const voteUIs: Partial<Record<PollType, PollTypeVoteUI>> = {
  CHOICE: choiceVoteUI,
  AVAILABILITY: availabilityVoteUI,
};

export function getPollTypeVoteUI(type: PollType): PollTypeVoteUI {
  const ui = voteUIs[type];
  if (!ui) throw new Error(`No voting UI for poll type ${type}`);
  return ui;
}
