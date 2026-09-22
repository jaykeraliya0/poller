import { testOutbox } from "@/lib/email/transport";

const pending: Promise<unknown>[] = [];

/**
 * Stands in for `deferEmail`: runs the task straight away and lets tests wait
 * for it. Failures are logged, not thrown, just like in the app.
 */
export function deferEmailNow(label: string, task: () => Promise<unknown>) {
  pending.push(task().catch((error) => console.error(`[email] ${label} failed`, error)));
}

/** Waits for deferred emails, then returns (and clears) everything sent so far. */
export async function flushEmails() {
  await Promise.all(pending.splice(0));
  return testOutbox.splice(0);
}
