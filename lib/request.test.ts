import { describe, expect, it } from "vitest";
import { UNKNOWN_IP, clientIpFromForwarded } from "@/lib/request";

describe("clientIpFromForwarded", () => {
  it("ignores the header when nothing trustworthy is in front", () => {
    expect(clientIpFromForwarded("1.2.3.4", 0)).toBe(UNKNOWN_IP);
    expect(clientIpFromForwarded("1.2.3.4", -1)).toBe(UNKNOWN_IP);
  });

  it("takes the last entry behind a single proxy", () => {
    expect(clientIpFromForwarded("203.0.113.7", 1)).toBe("203.0.113.7");
    expect(clientIpFromForwarded("198.51.100.9, 203.0.113.7", 1)).toBe("203.0.113.7");
  });

  it("cannot be spoofed by entries the client supplied", () => {
    // A client sending its own x-forwarded-for only prepends to the list.
    const spoofed = ["9.9.9.9", "8.8.8.8", "7.7.7.7"].join(", ");
    expect(clientIpFromForwarded(`${spoofed}, 203.0.113.7`, 1)).toBe("203.0.113.7");
  });

  it("steps one entry further left for each extra proxy", () => {
    const chain = "203.0.113.7, 10.0.0.1, 10.0.0.2";
    expect(clientIpFromForwarded(chain, 2)).toBe("10.0.0.1");
    expect(clientIpFromForwarded(chain, 3)).toBe("203.0.113.7");
  });

  it("trusts nothing when the chain is shorter than configured", () => {
    expect(clientIpFromForwarded("203.0.113.7", 2)).toBe(UNKNOWN_IP);
    expect(clientIpFromForwarded(null, 1)).toBe(UNKNOWN_IP);
    expect(clientIpFromForwarded("", 1)).toBe(UNKNOWN_IP);
    expect(clientIpFromForwarded("   ", 1)).toBe(UNKNOWN_IP);
  });

  it("normalizes ports and IPv6 brackets", () => {
    expect(clientIpFromForwarded("203.0.113.7:41234", 1)).toBe("203.0.113.7");
    expect(clientIpFromForwarded("[2001:db8::1]:41234", 1)).toBe("2001:db8::1");
    expect(clientIpFromForwarded("2001:db8::1", 1)).toBe("2001:db8::1");
    expect(clientIpFromForwarded(" 203.0.113.7 ", 1)).toBe("203.0.113.7");
  });

  it("rejects entries that aren't addresses", () => {
    expect(clientIpFromForwarded("unknown", 1)).toBe(UNKNOWN_IP);
    expect(clientIpFromForwarded("999.1.1.1", 1)).toBe(UNKNOWN_IP);
    expect(clientIpFromForwarded("rl:login:*", 1)).toBe(UNKNOWN_IP);
  });
});
