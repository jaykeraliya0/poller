import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { VOTER_TOKEN_COOKIE, createVoterToken, voterTokenCookieOptions } from "@/lib/voter-token";

const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = ["/dashboard", "/polls", "/settings"];
const AUTH_PAGES = ["/login", "/register"];

const matches = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * First redirect layer only: every page and action re-checks access itself.
 * Also gives each voting browser a stable voter_token.
 */
export default auth((request) => {
  const { pathname, search } = request.nextUrl;
  const signedIn = Boolean(request.auth?.user);

  if (!signedIn && PROTECTED_PREFIXES.some((prefix) => matches(pathname, prefix))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (signedIn && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (matches(pathname, "/p") && !request.cookies.has(VOTER_TOKEN_COOKIE)) {
    const token = createVoterToken();
    // Set on the request too, so the page rendering this request already sees it.
    request.cookies.set(VOTER_TOKEN_COOKIE, token);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(VOTER_TOKEN_COOKIE, token, voterTokenCookieOptions);
    return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/polls/:path*",
    "/settings/:path*",
    "/p/:path*",
    "/login",
    "/register",
  ],
};
