import { NextResponse, type NextRequest } from "next/server";
import { VOTER_TOKEN_COOKIE, createVoterToken, voterTokenCookieOptions } from "@/lib/voter-token";

const PROTECTED_PREFIXES = ["/dashboard", "/polls", "/settings"];

// Auth.js session cookie names (plain and __Secure- on https; large tokens are chunked as `.0`, `.1`, …).
const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;

const matches = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * Optimistic first layer only: it checks that a session cookie exists and
 * never decodes or rewrites it. Every page and action verifies the session
 * itself. Keeping Auth.js out of here matters: its wrapper re-issues the
 * session cookie on each request, so an in-flight prefetch could quietly sign
 * a user back in right after they signed out.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.getAll().some((cookie) => SESSION_COOKIE.test(cookie.name));

  if (!hasSession && PROTECTED_PREFIXES.some((prefix) => matches(pathname, prefix))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Give each voting browser a stable guest identity.
  if (matches(pathname, "/p") && !request.cookies.has(VOTER_TOKEN_COOKIE)) {
    const token = createVoterToken();
    // Set on the request too, so the page rendering this request already sees it.
    request.cookies.set(VOTER_TOKEN_COOKIE, token);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(VOTER_TOKEN_COOKIE, token, voterTokenCookieOptions);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/polls/:path*", "/settings/:path*", "/p/:path*"],
};
