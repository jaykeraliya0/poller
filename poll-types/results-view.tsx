import { AvailabilityResultsView } from "./availability/results-view";
import { ChoiceResultsView } from "./choice/results-view";
import { RankingResultsView } from "./ranking/results-view";
import { RatingResultsView } from "./rating/results-view";
import type { ResultsViewProps } from "./results-view-types";

/** Picks the type's results view from the insights' `kind`, so each view gets its narrowed type. */
export function TypeResultsView({ insights, ...rest }: ResultsViewProps) {
  switch (insights.kind) {
    case "CHOICE":
      return <ChoiceResultsView insights={insights} {...rest} />;
    case "AVAILABILITY":
      return <AvailabilityResultsView insights={insights} {...rest} />;
    case "RANKING":
      return <RankingResultsView insights={insights} {...rest} />;
    case "RATING":
      return <RatingResultsView insights={insights} {...rest} />;
  }
}
