import { createHash, timingSafeEqual } from "node:crypto";
import { runScheduledEmails } from "@/lib/email/poll-emails";

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Constant-time check of `Authorization: Bearer <CRON_SECRET>`. */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

/**
 * Sends automatic reminders and "poll closed" results emails. Call it every
 * few minutes from a scheduler (cron, Vercel Cron, …); every send is claimed
 * in the database first, so overlapping runs never double-send.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const sent = await runScheduledEmails();
  return Response.json(sent, { headers: { "Cache-Control": "no-store" } });
}
