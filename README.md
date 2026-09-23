# Poller

Create a poll, share a link, and see what the group decided — with insights, not just counts.

## Features

- **Four poll types** — pick an option, mark your availability across time slots, rank options in order, or rate them on a scale.
- **Insights** — who's leading and by how much, whether the group agrees or is split, the best time slot as a plain sentence, and charts for every poll type.
- **Share with anyone** — voters don't need an account unless you ask for one.
- **Private polls** — invite people by email, or share with a saved group.
- **Organiser controls** — deadlines, close and reopen, anonymous or named voting, and who gets to see the results.
- **Edit and archive** — change a poll while it's open, archive it when it's done, and act on several polls at once from the dashboard.
- **Exports** — responses as CSV, everything as JSON, reports as PDF, and a shareable results image.
- **Emails** — invitations, reminders for people who haven't voted, and a "results are in" email when a poll closes.

## Setup

You'll need Node 20+, pnpm, PostgreSQL and Redis.

```bash
pnpm install

createdb -T template0 poller_dev
createdb -T template0 poller_shadow

cp .env.example .env    # fill in AUTH_SECRET, see the comments in the file
pnpm db:migrate
pnpm db:seed            # optional demo data
pnpm dev
```

Open http://localhost:3000.

The demo seed creates two accounts, `demo@poller.dev` (organiser) and `voter@poller.dev`, both with the password `password123`.

## Using it

1. **Sign up** and confirm your email address.
2. **Create a poll** — start from a template or build your own, pick a type, add your options, and set a deadline if you want one.
3. **Share it** — copy the link, or invite people by email for a private poll.
4. **Watch it fill in** on the manage page, and nudge anyone who hasn't voted yet.
5. **Close the poll** when you're ready and read the results, or export them to share elsewhere.
