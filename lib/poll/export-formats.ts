/** Every file the owner can download for a poll, in menu order. */
export const EXPORT_FORMATS = [
  { format: "csv", label: "Responses (CSV)" },
  { format: "json", label: "All data (JSON)" },
  { format: "results-pdf", label: "Results report (PDF)" },
  { format: "results-png", label: "Results image (PNG)" },
  { format: "analytics-pdf", label: "Analytics report (PDF)" },
] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number]["format"];

export function parseExportFormat(value: string | null): ExportFormat | null {
  if (value === null) return "csv";
  return EXPORT_FORMATS.find((entry) => entry.format === value)?.format ?? null;
}
