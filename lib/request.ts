import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP for rate limiting. Assumes the app runs behind a proxy
 * that sets x-forwarded-for; without one this header is client-controlled.
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerList.get("x-real-ip") || "unknown";
}
