/**
 * Only allows same-origin relative paths as post-login destinations, so a
 * crafted `?next=` can't send users to another site.
 */
export function safeRedirectPath(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  try {
    const url = new URL(next, "http://placeholder.local");
    if (url.origin !== "http://placeholder.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
