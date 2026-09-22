/** Fewer responses than this and we show counts but don't call a winner. */
export const MIN_RESPONSES_FOR_OUTCOME = 3;

export type Scored = { optionId: string; label: string; score: number };

export type Outcome<T extends Scored = Scored> =
  | { kind: "NO_VOTES" }
  | { kind: "TOO_FEW"; responses: number }
  /** Responses exist but no option scored above zero (e.g. every slot is a "no"). */
  | { kind: "NO_SUPPORT" }
  | { kind: "TIE"; tied: T[] }
  | { kind: "LEADER"; leader: T; runnerUp: T | null; margin: number };

/**
 * Picks a leader from scored options (higher score is better). Pure and
 * shared by every poll type so ties and small samples behave the same way.
 */
export function decideOutcome<T extends Scored>(items: T[], responses: number): Outcome<T> {
  if (responses === 0) return { kind: "NO_VOTES" };
  if (responses < MIN_RESPONSES_FOR_OUTCOME) return { kind: "TOO_FEW", responses };

  const ranked = [...items].sort((a, b) => b.score - a.score);
  const [top, second] = ranked;
  if (!top || top.score <= 0) return { kind: "NO_SUPPORT" };

  const tied = ranked.filter((item) => item.score === top.score);
  if (tied.length > 1) return { kind: "TIE", tied };

  return {
    kind: "LEADER",
    leader: top,
    runnerUp: second ?? null,
    margin: top.score - (second?.score ?? 0),
  };
}

export type Consensus = "STRONG" | "MODERATE" | "SPLIT";

/** How decisive the leading share is, from 0–1 shares of respondents. */
export function consensusLevel(topShare: number, secondShare: number): Consensus {
  if (topShare >= 0.6 && topShare - secondShare >= 0.2) return "STRONG";
  if (topShare - secondShare < 0.1) return "SPLIT";
  return "MODERATE";
}

const listFormat = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

/** "A", "A and B", "A, B, and C" */
export function formatList(items: string[]): string {
  return listFormat.format(items);
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
