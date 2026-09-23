import "server-only";
import { headers } from "next/headers";

/** Rate-limit subject used when no client IP can be trusted. */
export const UNKNOWN_IP = "unknown";

const isIpv4 = (ip: string) => {
  const octets = ip.split(".");
  return octets.length === 4 && octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255);
};

const isIpv6 = (ip: string) => ip.includes(":") && /^[0-9a-f:.]+$/i.test(ip);

/**
 * How many proxies in front of the app append to `x-forwarded-for`. One for
 * the usual single reverse proxy (Vercel, an nginx or ALB in front of
 * `next start`); two if a CDN sits in front of that, and so on.
 *
 * Unset or `0` means nothing trustworthy is in front, so the header is
 * ignored entirely: it is client-controlled, and honouring it would let one
 * client spread its requests across unlimited rate-limit buckets.
 */
function trustedProxyHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS?.trim();
  if (!raw) return 0;
  const hops = Number(raw);
  if (!Number.isInteger(hops) || hops < 0) {
    console.warn(`[request] ignoring invalid TRUSTED_PROXY_HOPS=${raw}; treating the app as directly exposed`);
    return 0;
  }
  return hops;
}

/** Drops `[…]` brackets and any `:port` suffix, and rejects anything that isn't an address. */
function normalizeIp(value: string): string | null {
  let ip = value.trim();
  if (ip.startsWith("[")) {
    // `[::1]` or `[::1]:5678`.
    const closing = ip.indexOf("]");
    ip = closing === -1 ? ip.slice(1) : ip.slice(1, closing);
  } else if (ip.split(":").length === 2) {
    // `1.2.3.4:5678`. Bare IPv6 always has more than one colon, so it is safe here.
    ip = ip.slice(0, ip.indexOf(":"));
  }
  return isIpv4(ip) || isIpv6(ip) ? ip : null;
}

/**
 * The client IP according to `x-forwarded-for`, given `hops` trusted proxies.
 *
 * Each proxy appends the address it received the connection from, so with one
 * trusted proxy the client is the last entry, with two the second from last,
 * and so on. Everything further left was supplied by the client and is
 * ignored. A list too short for the configured chain means the request did not
 * arrive the expected way, so nothing in it is trusted.
 */
export function clientIpFromForwarded(forwarded: string | null, hops: number): string {
  if (hops <= 0 || !forwarded) return UNKNOWN_IP;
  const entries = forwarded.split(",").filter((entry) => entry.trim());
  if (entries.length < hops) return UNKNOWN_IP;
  return normalizeIp(entries[entries.length - hops]) ?? UNKNOWN_IP;
}

/**
 * Client IP for rate limiting, or `UNKNOWN_IP` when there is no trustworthy
 * one. Callers use it as a limit subject, so unknown clients share a bucket
 * and are limited together rather than not at all.
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  return clientIpFromForwarded(headerList.get("x-forwarded-for"), trustedProxyHops());
}
