import { AvailabilityAnalysisView } from "./availability/analysis-view";
import { ChoiceAnalysisView } from "./choice/analysis-view";
import { RankingAnalysisView } from "./ranking/analysis-view";
import { RatingAnalysisView } from "./rating/analysis-view";
import type { TypeInsights } from "./registry";

/** The type's extra analysis panels, picked from the insights' `kind`. */
export function TypeAnalysisView({ insights, totalResponses }: { insights: TypeInsights; totalResponses: number }) {
  switch (insights.kind) {
    case "CHOICE":
      return <ChoiceAnalysisView insights={insights} totalResponses={totalResponses} />;
    case "AVAILABILITY":
      return <AvailabilityAnalysisView insights={insights} totalResponses={totalResponses} />;
    case "RANKING":
      return <RankingAnalysisView insights={insights} totalResponses={totalResponses} />;
    case "RATING":
      return <RatingAnalysisView insights={insights} />;
  }
}
