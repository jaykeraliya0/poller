import "server-only";

/** Absolute public URL for sharing; APP_URL is the canonical origin. */
export function pollShareUrl(slug: string): string {
  const origin = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${origin}/p/${slug}`;
}
