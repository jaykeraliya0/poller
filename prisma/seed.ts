import { db } from "./seed/db";
import { DEMO_EMAIL, DEMO_PASSWORD, VOTER_EMAIL, seedShowcase } from "./seed/showcase";

/** Small, fast demo seed. For thousands of realistic records use `pnpm db:seed:large`. */
async function main() {
  const { polls } = await seedShowcase();
  console.log(`Seeded ${DEMO_EMAIL} and ${VOTER_EMAIL} (password: ${DEMO_PASSWORD})`);
  for (const poll of polls) console.log(`  /p/${poll.slug}  ${poll.title}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
