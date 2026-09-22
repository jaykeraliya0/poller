/**
 * The voter_token cookie identifies a browser for guest voting. Kept free of
 * server-only imports because the proxy uses it too.
 */
export const VOTER_TOKEN_COOKIE = "voter_token";

export const VOTER_TOKEN_MAX_AGE = 60 * 60 * 24 * 365;

export const voterTokenCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  // Follow the public URL rather than NODE_ENV so `next start` on http://localhost works.
  secure: process.env.APP_URL?.startsWith("https://") ?? false,
  path: "/",
  maxAge: VOTER_TOKEN_MAX_AGE,
} as const;

export function createVoterToken(): string {
  return crypto.randomUUID();
}
