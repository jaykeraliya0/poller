import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type Transport = (messages: EmailMessage[]) => Promise<void>;

/** Resend's batch endpoint takes up to 100 emails per call. */
const BATCH_SIZE = 100;
const RETRY_DELAYS_MS = [1_000, 3_000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function resendTransport(apiKey: string): Transport {
  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM ?? "Poller <onboarding@resend.dev>";

  return async (messages) => {
    for (let start = 0; start < messages.length; start += BATCH_SIZE) {
      const chunk = messages.slice(start, start + BATCH_SIZE).map((message) => ({ from, ...message }));
      for (let attempt = 0; ; attempt++) {
        const { error } =
          chunk.length === 1 ? await resend.emails.send(chunk[0]) : await resend.batch.send(chunk);
        if (!error) break;
        // Resend rate-limits per team; back off a little rather than drop the batch.
        if (error.name === "rate_limit_exceeded" && attempt < RETRY_DELAYS_MS.length) {
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }
        throw new Error(`Resend rejected ${chunk.length} email(s): ${error.name}: ${error.message}`);
      }
    }
  };
}

/** Without an API key (local dev, e2e), emails are printed so their links can still be followed. */
const consoleTransport: Transport = async (messages) => {
  for (const message of messages) {
    console.info(`[email] to=${message.to} subject=${JSON.stringify(message.subject)}\n${message.text}\n`);
  }
};

/** One JSON file per email, for end-to-end tests that need to follow links (EMAIL_OUTBOX_DIR). */
function fileTransport(dir: string): Transport {
  return async (messages) => {
    await mkdir(dir, { recursive: true });
    for (const message of messages) {
      const name = `${Date.now()}-${randomUUID()}.json`;
      await writeFile(path.join(dir, name), JSON.stringify({ ...message, sentAt: new Date().toISOString() }));
    }
  };
}

/** Unit and integration tests read sent emails from here. */
export const testOutbox: EmailMessage[] = [];

const memoryTransport: Transport = async (messages) => {
  testOutbox.push(...messages);
};

function pickTransport(): Transport {
  if (process.env.NODE_ENV === "test") return memoryTransport;
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) return resendTransport(apiKey);
  const outbox = process.env.EMAIL_OUTBOX_DIR;
  return outbox ? fileTransport(outbox) : consoleTransport;
}

let transport: Transport | undefined;

export async function sendEmails(messages: EmailMessage[]): Promise<void> {
  if (messages.length === 0) return;
  transport ??= pickTransport();
  await transport(messages);
}
