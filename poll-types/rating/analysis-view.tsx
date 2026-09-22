import { BoardSection } from "@/components/insights/board-section";
import { TallyLegend } from "@/components/insights/tally";
import { formatPercent } from "@/lib/insights/outcome";
import type { RatingInsights, RatingOptionResult } from "./insights";

/** "1–2", "3", "5–6": the scores in each sentiment bucket. */
function bucketRanges(scale: number) {
  const middle = (scale + 1) / 2;
  const scores = Array.from({ length: scale }, (_, i) => i + 1);
  const range = (values: number[]) => (values.length === 1 ? `${values[0]}` : `${values[0]}–${values.at(-1)}`);
  return {
    low: range(scores.filter((value) => value < middle - 0.5)),
    neutral: range(scores.filter((value) => Math.abs(value - middle) <= 0.5)),
    high: range(scores.filter((value) => value > middle + 0.5)),
  };
}

const byMean = (options: RatingOptionResult[]) =>
  options.filter((option) => option.count > 0).sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));

/**
 * Likert-style diverging bars: low ratings run left of the centre line, high
 * ones right, and neutral straddles it, so options line up on "net feeling".
 */
function SentimentBars({ insights }: { insights: RatingInsights }) {
  return (
    <ul className="flex flex-col gap-3">
      {byMean(insights.options).map((option) => {
        const { low, neutral, high } = option.sentiment;
        const share = (count: number) => count / option.count;
        // Each half of the track holds up to 100% of ratings; neutral is split across the centre.
        const width = (count: number) => `${share(count) * 100}%`;
        const summary = `${formatPercent(share(low))} low, ${formatPercent(share(neutral))} neutral, ${formatPercent(share(high))} high`;
        return (
          <li key={option.optionId} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 font-medium wrap-break-word">{option.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                <span className="sr-only">{summary}</span>
                <span aria-hidden>
                  {formatPercent(share(low))} · {formatPercent(share(high))}
                </span>
              </span>
            </div>
            <div className="relative h-4 overflow-hidden rounded-[4px] bg-viz-track" title={summary} aria-hidden>
              <div className="absolute inset-y-0 right-1/2 flex w-1/2 flex-row-reverse gap-[2px]">
                {neutral > 0 && <span className="h-full shrink-0 bg-viz-rest" style={{ width: width(neutral / 2) }} />}
                {low > 0 && <span className="h-full shrink-0 rounded-l-[4px] bg-viz-negative" style={{ width: width(low) }} />}
              </div>
              <div className="absolute inset-y-0 left-1/2 flex w-1/2 gap-[2px]">
                {neutral > 0 && <span className="h-full shrink-0 bg-viz-rest" style={{ width: width(neutral / 2) }} />}
                {high > 0 && <span className="h-full shrink-0 rounded-r-[4px] bg-viz-accent" style={{ width: width(high) }} />}
              </div>
              <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-foreground/40" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Where each option's average sits on the scale, with a band one standard deviation either side. */
function SpreadPlot({ insights }: { insights: RatingInsights }) {
  const { scale } = insights;
  const position = (value: number) => `${((value - 1) / (scale - 1)) * 100}%`;
  const ticks = scale === 5 ? [1, 2, 3, 4, 5] : [1, 4, 7, 10];

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {byMean(insights.options).map((option) => {
          const mean = option.mean!;
          const sd = option.standardDeviation ?? 0;
          const from = Math.max(1, mean - sd);
          const to = Math.min(scale, mean + sd);
          return (
            <li key={option.optionId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
              <span className="min-w-0 text-sm font-medium wrap-break-word">{option.label}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                <span className="sr-only">
                  Average {mean}, median {option.median}, typical range {Math.round(from * 10) / 10} to {Math.round(to * 10) / 10}
                </span>
                <span aria-hidden>
                  {mean} ± {sd}
                </span>
              </span>
              <div className="relative col-span-2 mx-1.5 h-4" aria-hidden title={`Average ${mean}, median ${option.median}`}>
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                <span
                  className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-viz-accent-soft"
                  style={{ left: position(from), width: `calc(${position(to)} - ${position(from)})` }}
                />
                <span
                  className="absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/60"
                  style={{ left: position(option.median!) }}
                />
                <span
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-viz-accent ring-2 ring-panel"
                  style={{ left: position(mean) }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="relative mx-1.5 h-4 text-xs text-muted-foreground tabular-nums" aria-hidden>
        {ticks.map((tick) => (
          <span key={tick} className="absolute -translate-x-1/2" style={{ left: position(tick) }}>
            {tick}
          </span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Dot = average, line = median, band = where most ratings fall (±1 standard deviation).
      </p>
    </div>
  );
}

export function RatingAnalysisView({ insights }: { insights: RatingInsights }) {
  if (!insights.options.some((option) => option.count > 0)) return null;
  const ranges = bucketRanges(insights.scale);
  return (
    <>
      <BoardSection
        id="analysis-sentiment-heading"
        title="Sentiment"
        description="Share of low and high ratings per option, centred on neutral."
      >
        <TallyLegend
          items={[
            { label: `Low (${ranges.low})`, tone: "negative" },
            { label: `Neutral (${ranges.neutral})`, tone: "rest" },
            { label: `High (${ranges.high})`, tone: "signal" },
          ]}
        />
        <SentimentBars insights={insights} />
      </BoardSection>
      <BoardSection id="analysis-spread-heading" title="Average and spread" description="How much voters agree on each score.">
        <SpreadPlot insights={insights} />
      </BoardSection>
    </>
  );
}
