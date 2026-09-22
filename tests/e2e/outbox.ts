import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/** Where the e2e server writes emails (see lib/email/transport.ts). */
export const EMAIL_OUTBOX_DIR = path.resolve("test-results/e2e-outbox");

type SentEmail = { to: string; subject: string; text: string; html: string; sentAt: string };

/**
 * The newest email to `to` whose subject matches. Emails are sent just after
 * the response, so this waits a little for one to arrive.
 */
export async function waitForEmail(to: string, subject: RegExp, timeoutMs = 10_000): Promise<SentEmail> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const files = (await readdir(EMAIL_OUTBOX_DIR).catch(() => [])).sort().reverse();
    for (const file of files) {
      const email = JSON.parse(await readFile(path.join(EMAIL_OUTBOX_DIR, file), "utf8")) as SentEmail;
      if (email.to.toLowerCase() === to.toLowerCase() && subject.test(email.subject)) return email;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`No email to ${to} matching ${subject} within ${timeoutMs}ms`);
}

/** The path (with query) of the first link to this app in an email. */
export function linkPath(email: SentEmail): string {
  const match = /https?:\/\/[^\s]+/.exec(email.text);
  if (!match) throw new Error(`No link in email "${email.subject}"`);
  const url = new URL(match[0]);
  return `${url.pathname}${url.search}`;
}
