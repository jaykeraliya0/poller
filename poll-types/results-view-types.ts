import type { TypeInsights } from "./registry";

export type ResultsViewProps<T extends TypeInsights = TypeInsights> = {
  insights: T;
  totalResponses: number;
  open: boolean;
};
