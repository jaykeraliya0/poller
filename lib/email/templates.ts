import type { EmailMessage } from "./transport";

type Content = Omit<EmailMessage, "to">;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/** A paragraph of user-supplied or fixed text. Always escaped. */
type Block = { kind: "text"; text: string; muted?: boolean } | { kind: "quote"; text: string };

type Layout = {
  subject: string;
  /** Hidden inbox preview line. */
  preview: string;
  heading: string;
  blocks: Block[];
  action: { label: string; url: string };
  /** Small print under the button, e.g. why they got this or when the link expires. */
  footnote: string;
  /** Poll emails link to notification settings; account emails don't (they can't be turned off). */
  settingsUrl?: string;
};

function render(layout: Layout): Content {
  const { subject, preview, heading, blocks, action, footnote, settingsUrl } = layout;

  const htmlBlocks = blocks
    .map((block) =>
      block.kind === "quote"
        ? `<p style="margin:0 0 16px;padding:8px 0 8px 14px;border-left:3px solid #c7c8ff;font-size:17px;font-weight:600;color:#14141a">${escapeHtml(block.text)}</p>`
        : `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${block.muted ? "#5b5b66" : "#14141a"}">${escapeHtml(block.text)}</p>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preview)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px 28px">
<tr><td>
<p style="margin:0 0 24px;font-size:15px;font-weight:800;letter-spacing:-0.01em;color:#3b38f0">Poller</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:#14141a">${escapeHtml(heading)}</h1>
${htmlBlocks}
<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#3b38f0;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:8px">${escapeHtml(action.label)}</a></p>
<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#5b5b66">Or paste this link into your browser:<br><a href="${escapeHtml(action.url)}" style="color:#2a27c9;word-break:break-all">${escapeHtml(action.url)}</a></p>
<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#5b5b66">${escapeHtml(footnote)}${
    settingsUrl
      ? ` <a href="${escapeHtml(settingsUrl)}" style="color:#2a27c9">Email settings</a>`
      : ""
  }</p>
</td></tr></table>
</td></tr></table>
</body></html>`;

  const text = [
    heading,
    "",
    ...blocks.flatMap((block) => [block.kind === "quote" ? `> ${block.text}` : block.text, ""]),
    `${action.label}: ${action.url}`,
    "",
    footnote,
    ...(settingsUrl ? [`Email settings: ${settingsUrl}`] : []),
  ].join("\n");

  return { subject, html, text };
}

export function verifyEmailTemplate(input: { name: string; url: string }): Content {
  return render({
    subject: "Confirm your email for Poller",
    preview: "One click to confirm your address.",
    heading: `Confirm your email, ${input.name}`,
    blocks: [
      {
        kind: "text",
        text: "Confirming your address lets you create polls, open private polls people invite you to, and get emails about polls.",
      },
    ],
    action: { label: "Confirm email", url: input.url },
    footnote: "This link expires in 48 hours. If you didn't create a Poller account, you can ignore this email.",
  });
}

export function passwordResetTemplate(input: { name: string; url: string }): Content {
  return render({
    subject: "Reset your Poller password",
    preview: "Choose a new password. The link expires in 1 hour.",
    heading: "Reset your password",
    blocks: [
      { kind: "text", text: `Hi ${input.name}, someone asked to reset the password for your Poller account.` },
      { kind: "text", text: "Choosing a new password signs you out everywhere else." },
    ],
    action: { label: "Choose a new password", url: input.url },
    footnote: "This link expires in 1 hour and works once. If you didn't ask for this, ignore this email: your password stays the same.",
  });
}

type PollSummary = { title: string; description: string | null; closesIn: string | null };

function pollBlocks(poll: PollSummary): Block[] {
  return [
    { kind: "quote", text: poll.title },
    ...(poll.description ? [{ kind: "text" as const, text: poll.description, muted: true }] : []),
    ...(poll.closesIn ? [{ kind: "text" as const, text: `Voting closes ${poll.closesIn}.` }] : []),
  ];
}

export function pollInviteTemplate(input: {
  ownerName: string;
  email: string;
  poll: PollSummary;
  url: string;
  settingsUrl: string;
}): Content {
  return render({
    subject: `${input.ownerName} invited you to vote: ${input.poll.title}`,
    preview: `${input.ownerName} wants your vote on a private poll.`,
    heading: `${input.ownerName} wants your vote`,
    blocks: pollBlocks(input.poll),
    action: { label: "Open the poll", url: input.url },
    footnote: `This poll is private. Sign in or create an account with ${input.email} and confirm the address to open it.`,
    settingsUrl: input.settingsUrl,
  });
}

export function pollReminderTemplate(input: {
  ownerName: string;
  poll: PollSummary;
  url: string;
  settingsUrl: string;
}): Content {
  return render({
    subject: input.poll.closesIn ? `Reminder: voting closes ${input.poll.closesIn}` : `Reminder: ${input.poll.title}`,
    preview: `${input.ownerName} is still waiting for your vote.`,
    heading: "You haven't voted yet",
    blocks: [{ kind: "text", text: `${input.ownerName} invited you to this poll and is still waiting for your answer.` }, ...pollBlocks(input.poll)],
    action: { label: "Vote now", url: input.url },
    footnote: "You're getting this because you were invited to this private poll.",
    settingsUrl: input.settingsUrl,
  });
}

export function pollResultsTemplate(input: {
  isOwner: boolean;
  title: string;
  responses: number;
  headline: string | null;
  url: string;
  settingsUrl: string;
}): Content {
  const counted = `${input.responses} ${input.responses === 1 ? "response was" : "responses were"} counted.`;
  return render({
    subject: `Results are in: ${input.title}`,
    preview: input.headline ?? counted,
    heading: input.isOwner ? "Your poll has closed" : "The poll you voted on has closed",
    blocks: [
      { kind: "quote", text: input.title },
      ...(input.headline ? [{ kind: "text" as const, text: input.headline }] : []),
      { kind: "text", text: counted, muted: true },
    ],
    action: { label: input.isOwner ? "See the full breakdown" : "See the results", url: input.url },
    footnote: input.isOwner
      ? "You're getting this because you created this poll."
      : "You're getting this because you voted on this poll.",
    settingsUrl: input.settingsUrl,
  });
}
