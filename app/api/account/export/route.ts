import { getCurrentUser } from "@/lib/auth/guards";
import { utcDayKey } from "@/lib/datetime";
import { buildAccountJson, loadAccountExport } from "@/lib/export/account";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Everything the signed-in account holds, as one JSON file: the profile,
 * the polls they created with every response, their groups, and the votes
 * they cast elsewhere. Signed-out visitors get a 401, never someone else's data.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in to download your data.", { status: 401 });

  // Reads every poll the account owns, so keep it to a handful per hour.
  const limit = await checkRateLimit("account-export", user.id);
  if (!limit.allowed) {
    return new Response("Too many downloads. Try again shortly.", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfter) },
    });
  }

  const data = await loadAccountExport(user.id);
  return new Response(buildAccountJson(data), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="poller-account-${utcDayKey(data.generatedAt)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
