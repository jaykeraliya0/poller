import { NextResponse, type NextRequest } from "next/server";
import { verifyEmail } from "@/lib/auth/account-emails";
import { getCurrentUser } from "@/lib/auth/guards";

/**
 * The link in the confirmation email. The token alone proves the inbox, so
 * this works signed out too; afterwards it lands wherever makes sense.
 */
export async function GET(request: NextRequest) {
  const verifiedUserId = await verifyEmail(request.nextUrl.searchParams.get("token"));
  if (!verifiedUserId) return redirectTo(request, "/verify-email/invalid");

  const user = await getCurrentUser();
  return redirectTo(request, user?.id === verifiedUserId ? "/dashboard?verified=1" : "/login?verified=1");
}

function redirectTo(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url), 303);
  // Keep the token out of logs and analytics on the next page.
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
