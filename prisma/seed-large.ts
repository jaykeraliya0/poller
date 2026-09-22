import { db } from "./seed/db";
import { createRandom } from "./seed/random";
import { seedRealistic } from "./seed/realistic";
import { DEMO_EMAIL, DEMO_PASSWORD, VOTER_EMAIL, seedShowcase } from "./seed/showcase";

/**
 * Wipes the database and fills it with the showcase polls plus thousands of
 * realistic users, polls and votes. Deterministic: same data on every run.
 */
async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to wipe a production database");
  const started = Date.now();

  await db.$executeRawUnsafe('TRUNCATE TABLE "answers", "responses", "poll_options", "polls", "users" RESTART IDENTITY CASCADE');
  const { demo, voter, passwordHash, polls: showcase } = await seedShowcase();
  const stats = await seedRealistic({ random: createRandom(20260922), passwordHash, demoId: demo.id, voterId: voter.id });

  const [users, polls, responses, answers] = await Promise.all([
    db.user.count(),
    db.poll.count(),
    db.pollResponse.count(),
    db.answer.count(),
  ]);
  console.log(`Generated ${stats.polls} polls, ${stats.responses} responses, ${stats.answers} answers in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(`Database now has ${users} users, ${polls} polls, ${responses} responses, ${answers} answers`);
  console.log(`Sign in as ${DEMO_EMAIL} or ${VOTER_EMAIL} (password: ${DEMO_PASSWORD}); every generated user uses the same password.`);
  for (const poll of showcase) console.log(`  /p/${poll.slug}  ${poll.title}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
