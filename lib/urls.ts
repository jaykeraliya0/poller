import "server-only";

/** Absolute URL for `path` on the canonical origin (APP_URL), for share links and emails. */
export function appUrl(path: string): string {
  const origin = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${origin}${path}`;
}

/** Absolute public URL for sharing. */
export function pollShareUrl(slug: string): string {
  return appUrl(`/p/${slug}`);
}
