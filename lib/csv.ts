/**
 * Spreadsheet apps execute cells starting with these as formulas (CSV/formula
 * injection), so such cells get a leading apostrophe.
 */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export function csvCell(value: string): string {
  const safe = FORMULA_TRIGGER.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** RFC 4180 CSV with CRLF line endings. */
export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
