import type { PollTemplate } from "../../generated/prisma/enums";

export const FIRST_NAMES = [
  "Aarav", "Aisha", "Alex", "Amara", "Ana", "Andre", "Anika", "Ben", "Bianca", "Carlos", "Chen", "Chloe", "Daniel",
  "Deepa", "Diego", "Elena", "Emma", "Ethan", "Fatima", "Felix", "Grace", "Hana", "Hiro", "Ines", "Isaac", "Ivy",
  "Jamal", "James", "Jin", "Jonas", "Julia", "Kai", "Karan", "Kate", "Leila", "Leo", "Liam", "Lina", "Lucas", "Maya",
  "Mei", "Mia", "Mohammed", "Nadia", "Noah", "Nora", "Olivia", "Omar", "Oscar", "Priya", "Rafael", "Rahul", "Riya",
  "Rosa", "Sam", "Sara", "Sofia", "Tariq", "Tom", "Uma", "Victor", "Wei", "Yara", "Yusuf", "Zara", "Zoe",
];

export const LAST_NAMES = [
  "Adeyemi", "Ahmed", "Alvarez", "Andersson", "Bauer", "Brown", "Chen", "Costa", "Das", "Dubois", "Evans", "Fernandes",
  "Fischer", "Garcia", "Gupta", "Haddad", "Hansen", "Ito", "Iyer", "Jensen", "Johnson", "Kaur", "Khan", "Kim", "Kowalski",
  "Kumar", "Larsen", "Lee", "Lopez", "Martin", "Mehta", "Moreau", "Müller", "Nakamura", "Nguyen", "Novak", "Okafor",
  "Olsen", "Patel", "Pereira", "Petrov", "Rossi", "Sato", "Schmidt", "Shah", "Silva", "Singh", "Smith", "Tanaka",
  "Taylor", "Wang", "Weber", "Williams", "Wilson", "Yilmaz", "Zhang",
];

export const EMAIL_DOMAINS = ["acme.io", "northwind.dev", "globex.com", "initech.co", "gmail.com", "outlook.com"];

export const TIME_ZONES = [
  "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Kolkata", "Asia/Singapore",
  "Australia/Sydney", "America/Sao_Paulo",
];

type Topic = { title: string; description?: string; options: string[] };

/** Choice polls: pick one (or a few). */
export const CHOICE_TOPICS: (Topic & { template?: PollTemplate; multi?: number })[] = [
  { title: "Where should we go for team lunch on Friday?", options: ["Thai Garden", "Burger Barn", "Sushi Den", "Taco Loco", "The Salad Bar", "Pho 88", "Nonna's Pizza"] },
  { title: "Which workshop should we run next month?", template: "WORKSHOP_TOPIC", multi: 2, description: "Pick up to two topics you'd attend.", options: ["Testing React apps", "Postgres performance", "Accessibility basics", "Intro to TypeScript generics", "Writing good RFCs", "Observability 101", "Giving better feedback"] },
  { title: "Theme for the end-of-year party?", options: ["80s night", "Casino royale", "Winter wonderland", "Festival vibes", "Murder mystery", "Karaoke & tacos"] },
  { title: "What time should daily standup move to?", options: ["9:15", "9:30", "10:00", "10:30", "Async in Slack"] },
  { title: "Which snacks should we stock in the office?", multi: 3, description: "Pick up to three.", options: ["Fresh fruit", "Trail mix", "Dark chocolate", "Protein bars", "Crisps", "Hummus & veggies", "Granola", "Popcorn"] },
  { title: "Name for the new platform team?", options: ["Foundations", "Bedrock", "Launchpad", "Keystone", "Atlas", "Scaffold"] },
  { title: "Which conference should we send the team to?", options: ["React Summit", "KubeCon", "QCon", "Config", "PyCon", "Strange Loop"] },
  { title: "Issue tracker for the new project?", description: "We'll migrate at the start of next quarter.", options: ["Linear", "Jira", "GitHub Projects", "Shortcut"] },
  { title: "Which charity should the team match donations for?", options: ["Local food bank", "Code Club", "Médecins Sans Frontières", "Rainforest Trust", "Mind (mental health)"] },
  { title: "Friday demo format?", options: ["Live demos", "Recorded videos", "Written updates", "Rotate each week"] },
  { title: "Which languages should the reading group cover?", multi: 2, options: ["Rust", "Go", "Elixir", "Kotlin", "Zig", "Haskell"] },
  { title: "Where should the Q3 celebration dinner be?", options: ["Rooftop terrace", "Italian trattoria", "Korean BBQ", "Brewery tour", "Tapas bar"] },
  { title: "What should our mascot be?", options: ["Otter", "Owl", "Fox", "Octopus", "Capybara", "Red panda"] },
  { title: "Preferred format for the design review?", options: ["Figma comments", "Live walkthrough", "Loom video", "Written doc"] },
  { title: "Which perk should we add next year?", options: ["Learning budget", "Gym membership", "Extra day off", "Home office upgrade", "Commuter pass"] },
];

/** Availability polls: find a time. */
export const AVAILABILITY_TOPICS: Topic[] = [
  { title: "Team offsite planning call", description: "One hour to agree on the agenda." },
  { title: "Quarterly all-hands rehearsal" },
  { title: "Book club: next meeting", description: "We're reading 'The Pragmatic Programmer'." },
  { title: "Sprint retrospective" },
  { title: "Board game night", description: "Bring snacks!" },
  { title: "Hackathon kickoff" },
  { title: "Customer interview slots", description: "Pick every slot you could join as a note taker." },
  { title: "Family dinner: when works?" },
  { title: "Volunteer shift at the food bank" },
  { title: "Onboarding buddy check-in" },
  { title: "Incident review for last week's outage" },
  { title: "Five-a-side football" },
].map((topic) => ({ ...topic, options: [] }));

/** Ranking polls: order by preference. */
export const RANKING_TOPICS: (Topic & { template?: PollTemplate })[] = [
  { title: "What should we build next?", template: "FEATURE_PRIORITY", description: "Rank the features you think matter most.", options: ["Dark mode", "Offline support", "CSV export", "Faster search", "SSO login", "Mobile app", "Public API", "Slack integration"] },
  { title: "Q3 OKR priorities", options: ["Reduce churn", "Improve onboarding", "Launch in Germany", "Cut infra costs", "Hire 3 engineers", "SOC 2 audit"] },
  { title: "Which tech debt should we pay down first?", options: ["Flaky test suite", "Legacy auth service", "Slow CI pipeline", "Outdated React version", "Monolithic billing module", "Missing DB indexes"] },
  { title: "Movie night picks", options: ["Arrival", "Spirited Away", "The Grand Budapest Hotel", "Inception", "Parasite", "Paddington 2", "Everything Everywhere All at Once"] },
  { title: "Hiring priorities for next half", options: ["Senior backend", "Product designer", "Data engineer", "Engineering manager", "QA engineer", "Developer advocate"] },
  { title: "Topics for the internal tech talks series", options: ["How our search works", "Postmortem culture", "Feature flags at scale", "Our data pipeline", "Accessibility wins", "Cost optimisation"] },
  { title: "Where should the next team trip go?", options: ["Lisbon", "Kyoto", "Cape Town", "Reykjavik", "Barcelona", "Mexico City"] },
];

/** Rating polls: score each option. */
export const RATING_TOPICS: (Topic & { template?: PollTemplate; lowLabel: string; highLabel: string })[] = [
  { title: "Where should we go for the offsite?", template: "OFFSITE_LOCATION", lowLabel: "Not keen", highLabel: "Love it", options: ["Lisbon", "Barcelona", "Amsterdam", "Berlin", "Edinburgh", "Porto", "Prague"] },
  { title: "Rate the new onboarding experience", lowLabel: "Poor", highLabel: "Excellent", options: ["Welcome pack", "Laptop setup", "Buddy programme", "First-week schedule", "Documentation", "Team intros"] },
  { title: "How were the conference talks?", lowLabel: "Skip it", highLabel: "Must watch", options: ["Keynote", "Scaling Postgres", "Design systems in practice", "Rust in production", "The future of CSS", "Leading remote teams"] },
  { title: "Logo concepts for the rebrand", lowLabel: "No", highLabel: "Yes!", options: ["Concept A: wordmark", "Concept B: monogram", "Concept C: abstract wave", "Concept D: mascot", "Concept E: geometric"] },
  { title: "Rate this week's canteen menu", lowLabel: "Awful", highLabel: "Delicious", options: ["Monday curry", "Tuesday tacos", "Wednesday pasta", "Thursday stir-fry", "Friday fish & chips"] },
  { title: "How useful are our recurring meetings?", lowLabel: "Waste of time", highLabel: "Essential", options: ["Monday planning", "Daily standup", "Design crit", "Friday demo", "Monthly all-hands", "1:1s"] },
  { title: "Restaurant shortlist for the client dinner", lowLabel: "Avoid", highLabel: "Perfect", options: ["Hawksmoor", "Dishoom", "Padella", "Gymkhana", "St. John", "Barrafina"] },
];

export const COMMENTS = {
  general: [
    "Happy with any of these, honestly.",
    "Thanks for organising!",
    "Can we decide by Friday?",
    "I'd be up for trying something new.",
    "Whatever works for most people works for me.",
    "Great idea, let's do it more often.",
    "I'm flexible, just let me know.",
    "Could we add a vegetarian-friendly option next time?",
    "Please share the results in the channel.",
    "Voted! Excited for this.",
  ],
  AVAILABILITY: [
    "Mornings are hard for me because of school runs.",
    "I'm travelling on Thursday but could dial in.",
    "Anything after 5pm is tricky, sorry.",
    "I'll be in a different time zone that week.",
    "Friday afternoons are best for me.",
  ],
  RANKING: [
    "SSO keeps coming up in sales calls.",
    "The flaky tests are slowing everyone down.",
    "Hard to choose, the top two are close for me.",
    "We promised the API to two customers already.",
    "I'd rather fix the basics before new features.",
  ],
  RATING: [
    "Loved it last time we went.",
    "A bit pricey for a big group.",
    "Easy to get to from the office.",
    "Not great for people with dietary requirements.",
    "Really depends on the weather that week.",
  ],
  CHOICE: [
    "Last time the queue was really long.",
    "Would love to try the new place.",
    "Anything but pizza again, please.",
    "This one is closer to the office.",
    "Let's pick something everyone can join.",
  ],
} as const;
