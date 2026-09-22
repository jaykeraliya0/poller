import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { buildCsv } from "@/lib/export/csv";
import { loadPollExport } from "@/lib/export/data";
import { buildJson } from "@/lib/export/json";
import { renderAnalyticsPdf, renderResultsPdf } from "@/lib/export/pdf/render";
import { renderResultsImage } from "@/lib/export/results-image";
import { parseExportFormat, type ExportFormat } from "@/lib/poll/export-formats";
import { checkRateLimit } from "@/lib/rate-limit";

const notFound = () => new Response("Not found", { status: 404 });

const FILES: Record<ExportFormat, { suffix: string; contentType: string }> = {
  csv: { suffix: "responses.csv", contentType: "text/csv; charset=utf-8" },
  json: { suffix: "export.json", contentType: "application/json; charset=utf-8" },
  "results-pdf": { suffix: "results.pdf", contentType: "application/pdf" },
  "results-png": { suffix: "results.png", contentType: "image/png" },
  "analytics-pdf": { suffix: "analytics.pdf", contentType: "application/pdf" },
};

/**
 * Owner-only downloads of a poll: `?format=csv` (default), `json`,
 * `results-pdf`, `results-png` or `analytics-pdf`. Anyone else gets a 404,
 * like the manage page.
 */
export async function GET(request: Request, context: RouteContext<"/api/polls/[id]/export">) {
  const { id } = await context.params;
  const format = parseExportFormat(new URL(request.url).searchParams.get("format"));
  if (!format) return new Response("Unknown export format", { status: 400 });

  const user = await getCurrentUser();
  if (!user || !z.uuid().safeParse(id).success) return notFound();
  const owned = await db.poll.findFirst({ where: { id, creatorId: user.id }, select: { id: true, slug: true } });
  if (!owned) return notFound();

  // Reports are rendered on the server; keep one account from tying it up.
  const limit = await checkRateLimit("export", user.id);
  if (!limit.allowed) {
    return new Response("Too many exports. Try again shortly.", { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }

  const data = await loadPollExport(owned.id);
  const { suffix, contentType } = FILES[format];
  const headers = {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="poll-${owned.slug}-${suffix}"`,
    "Cache-Control": "no-store",
  };

  switch (format) {
    case "csv":
      return new Response(buildCsv(data), { headers });
    case "json":
      return new Response(buildJson(data), { headers });
    case "results-png":
      return renderResultsImage(data, headers);
    case "results-pdf":
      return new Response(new Uint8Array(await renderResultsPdf(data)), { headers });
    case "analytics-pdf":
      return new Response(new Uint8Array(await renderAnalyticsPdf(data)), { headers });
  }
}
