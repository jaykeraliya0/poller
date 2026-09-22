import "server-only";
import { after } from "next/server";

/**
 * Sends email after the response is on its way, so a slow or failing mail
 * provider never holds up or fails the action that triggered it.
 */
export function deferEmail(label: string, task: () => Promise<unknown>): void {
  after(async () => {
    try {
      await task();
    } catch (error) {
      console.error(`[email] ${label} failed`, error);
    }
  });
}
