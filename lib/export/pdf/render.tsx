import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import type { PollExport } from "../data";
import { AnalyticsReport } from "./analytics-report";
import { ResultsReport } from "./results-report";

export function renderResultsPdf(data: PollExport): Promise<Buffer> {
  return renderToBuffer(<ResultsReport data={data} />);
}

export function renderAnalyticsPdf(data: PollExport): Promise<Buffer> {
  return renderToBuffer(<AnalyticsReport data={data} />);
}
