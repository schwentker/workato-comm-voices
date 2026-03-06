/**
 * scripts/seed-historic.ts
 *
 * Seeds the Neon DB with all historic Workato hackathon data sourced from
 * a Parallel.ai research report (workato-hackathons.json).
 *
 * Run once:  npm run seed:historic
 * Idempotent: skips gracefully if hackathon_events already has rows.
 *
 * Creates:
 *   - hackathon_events  (15 events, 2018–2025)
 *   - registrations     (13 judges + 12 team leads as participants)
 *   - teams             (12 winning teams)
 *   - team_members      (one lead per team)
 *   - submissions       (12 winning projects, status = "scored")
 *   - awards            (one per project)
 *   - scores            (judge scores per submission)
 */

import postgres from "postgres";

const DATABASE_URL = process.env["DATABASE_URL"];
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL not set — add it to .env");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: "require", max: 1 });

// ── Helpers ───────────────────────────────────────────────────────────────────

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");

const judgeEmail = (name: string) => `${slugify(name)}@workato.com`;
const leadEmail  = (team: string) => `${slugify(team).slice(0, 44)}.lead@workato-hack.dev`;

// ── Data: Hackathon Events ────────────────────────────────────────────────────

interface EventDef {
  name: string; year: number; date_held: string | null;
  location: string; modality: "in-person" | "virtual" | "hybrid";
  organizer: string; category: "internal" | "public" | "sponsored" | "university" | "enterprise" | "student";
  theme: string; participant_count: string; platform: string; source_url: string;
}

const EVENTS: EventDef[] = [
  // ── Internal ──────────────────────────────────────────────────────────────
  {
    name: "Workato Automation Hackathon", year: 2022, date_held: "2022-06-01",
    location: "Mountain View, CA (virtual)", modality: "virtual",
    organizer: "Workato Business Technology — Carter Busse (CIO), Stephanie Dwight (Sr Director, Automations & Applications)",
    category: "internal",
    theme: "Employee-led automations — build any solution with Workato's low-code/no-code platform",
    participant_count: "209 employees across 77 teams (~30% of company)",
    platform: "Internal Workato platform, Workbot for Slack",
    source_url: "https://www.businesswire.com/news/home/20220627005522/en/Workato-Announces-Winners-of-First-Annual-Employee-Led-Automation-Hackathon",
  },
  {
    name: "Workato Automation & AI Hackathon", year: 2023, date_held: "2023-06-01",
    location: "Mountain View, CA (virtual)", modality: "virtual",
    organizer: "Workato Business Technology — Carter Busse (CIO), Stephanie Dwight (Sr Director, Automations & Applications)",
    category: "internal",
    theme: "Automation and Artificial Intelligence — leverage generative AI and the OpenAI connector",
    participant_count: "48+ entries; 30%+ of company (50% of admin team, 45% of legal team)",
    platform: "Internal Workato platform, Workspaces, Workbot for Slack (April Bot), Google Drive",
    source_url: "https://www.businesswire.com/news/home/20230608005527/en/Workato-Announces-Winners-of-Annual-Employee-Led-Automation-and-AI-Hackathon",
  },
  {
    name: "Workato Internal Hackathon", year: 2024, date_held: null,
    location: "Virtual", modality: "virtual",
    organizer: "Workato Business Technology (BT) team",
    category: "internal",
    theme: "Building automation solutions with Workato — open theme",
    participant_count: "Hundreds of participants; 50% of admin team, 45% of legal team",
    platform: "Internal Workato platform",
    source_url: "https://systematic.workato.com/t5/uk-i-user-group/workato-what-s-trending-at-workato-june-7th-2024/m-p/6873",
  },
  // ── Public ────────────────────────────────────────────────────────────────
  {
    name: "HackAIton — Workato AI Hackathon Hyderabad", year: 2025, date_held: "2025-03-22",
    location: "91Springboard, Hitech Kondapur, Hyderabad, India", modality: "in-person",
    organizer: "Workato Community & Education Partnership team",
    category: "public",
    theme: "Leverage AI to build intelligent, automated workflows that enhance business efficiency, decision-making, and user experience",
    participant_count: "Not disclosed",
    platform: "Workato Systematic community, JotForm (registration)",
    source_url: "https://systematic.workato.com/t5/events/hackaiton-workato-ai-hackathon/ev-p/8979",
  },
  {
    name: "Workato Hack-AI-thon Berlin", year: 2025, date_held: "2025-03-27",
    location: "SoundCloud Global Limited & Co. KG, Berlin, Germany", modality: "in-person",
    organizer: "Workato EMEA Marketing",
    category: "public",
    theme: "Tackle a real-world use case with Workato — build AI-powered automation solutions",
    participant_count: "Not disclosed",
    platform: "Workato marketing registration page (mktg.workato.com)",
    source_url: "https://mktg.workato.com/EMEA-LE-2025-03-27_Registrationpage.html",
  },
  // ── Sponsored ─────────────────────────────────────────────────────────────
  {
    name: "DevNetwork API + Cloud + Data Hackathon", year: 2025, date_held: "2025-09-04",
    location: "Santa Clara, CA (hybrid — online Aug–Sep, in-person Sep 4–5)", modality: "hybrid",
    organizer: "DevNetwork / API World — Workato sponsor + challenge owner ($1,000 prize track)",
    category: "sponsored",
    theme: "API, Cloud, and Data innovation — Workato challenge: build solutions using Workato APIs",
    participant_count: "Not disclosed",
    platform: "Devpost, Eventbrite",
    source_url: "https://devnetwork--api-cloud-2025.devpost.com/",
  },
  {
    name: "API World + CloudX Hackathon", year: 2024, date_held: "2024-10-01",
    location: "Santa Clara, CA (hybrid)", modality: "hybrid",
    organizer: "DevNetwork / API World — Workato as sponsor; total prize pool $34,525",
    category: "sponsored",
    theme: "World's Largest API + Cloud Integration Hackathon",
    participant_count: "Not disclosed",
    platform: "Devpost, Eventbrite",
    source_url: "https://api-world-2024-hackathon.devpost.com/",
  },
  {
    name: "API World Hackathon", year: 2021, date_held: null,
    location: "Online", modality: "virtual",
    organizer: "DevNetwork / API World — total prize pool $31,500",
    category: "sponsored",
    theme: "Progress, Concept, and Feasibility in API innovation",
    participant_count: "Not disclosed",
    platform: "Devpost",
    source_url: "https://api-world-hackathon-2021.devpost.com/",
  },
  {
    name: "API World Hackathon", year: 2020, date_held: null,
    location: "Online", modality: "virtual",
    organizer: "DevNetwork / API World — total prize pool $15,500",
    category: "sponsored",
    theme: "Progress, Concept, and Feasibility in API innovation",
    participant_count: "180 participants",
    platform: "Devpost",
    source_url: "https://apiworld2020.devpost.com/",
  },
  {
    name: "API World Hackathon", year: 2018, date_held: null,
    location: "San Jose, CA", modality: "in-person",
    organizer: "DevNetwork / API World — Workato co-founders Dimitris Kogias & Harish Shetty as mentors/speakers",
    category: "sponsored",
    theme: "API innovation — OPEN TALK: Confessions of a Professional API Wrangler",
    participant_count: "Not disclosed",
    platform: "API World event platform",
    source_url: "https://apiworld2018.sched.com/overview/type/Hackathon",
  },
  // ── University ────────────────────────────────────────────────────────────
  {
    name: "Rajalakshmi Engineering College × Workato AI Hackathon", year: 2025, date_held: "2025-07-09",
    location: "Rajalakshmi Engineering College, Chennai, Tamil Nadu, India", modality: "in-person",
    organizer: "Workato Education Partnership Program + Rajalakshmi Engineering College",
    category: "university",
    theme: "24-hour campus hack — AI-powered automations; solutions must use Workato AI features. Prize pool: INR 50,000 / 25,000 / 15,000 / 10,000",
    participant_count: "550+ students",
    platform: "Workato Education Partnership portal, Facebook (announcements)",
    source_url: "https://www.facebook.com/workato/posts/1196763742465420/",
  },
  {
    name: "Rajalakshmi Engineering College × Workato AI Hackathon", year: 2023, date_held: null,
    location: "Rajalakshmi Engineering College, Chennai, Tamil Nadu, India", modality: "in-person",
    organizer: "Workato Education Partnership Program + Rajalakshmi Engineering College",
    category: "university",
    theme: "AI-powered automations using Workato — team size max 4. Prize pool: INR 25,000 / 20,000 / 15,000",
    participant_count: "Not specified",
    platform: "Campus registration, Scribd (event rules)",
    source_url: "https://www.scribd.com/document/908923451/Rec-x-Workato-Ai-Hackathon",
  },
  // ── Enterprise ────────────────────────────────────────────────────────────
  {
    name: "Workday + Workato Bay Area Hackathon", year: 2023, date_held: "2023-03-01",
    location: "The Firehouse at Fort Mason, 2 Marina Blvd, San Francisco, CA 94123", modality: "in-person",
    organizer: "Workato + Workday (enterprise co-host)",
    category: "enterprise",
    theme: "Automating HR and Finance with Workday and Workato — API-led integrations between the two platforms",
    participant_count: "Not disclosed",
    platform: "resources.workato.com (dedicated landing page)",
    source_url: "https://resources.workato.com/workato-workday-hackathon-2023/",
  },
  // ── Student clubs ─────────────────────────────────────────────────────────
  {
    name: "HackRift 2025", year: 2025, date_held: "2025-12-12",
    location: "Singapore Institute of Technology, Singapore", modality: "in-person",
    organizer: "SITech Developers Club — Workato as industry partner + judge",
    category: "student",
    theme: "Innovation and technology for real-world impact",
    participant_count: "Not disclosed",
    platform: "Devpost",
    source_url: "https://hackrift2025.devpost.com/",
  },
  {
    name: "HackRift 2024", year: 2024, date_held: null,
    location: "Singapore Institute of Technology, Singapore", modality: "in-person",
    organizer: "SITech Developers Club — Workato as supporting partner + judge",
    category: "student",
    theme: "Innovation and technology",
    participant_count: "Not disclosed",
    platform: "LinkedIn, Devpost",
    source_url: "https://sg.linkedin.com/company/sitech-developers-club",
  },
];

// ── Data: Judges ──────────────────────────────────────────────────────────────

interface JudgeDef {
  name: string; title: string; org: string;
  skills: string[]; track: "ai" | "enterprise" | "open";
  eventNames: string[];
}

const JUDGES: JudgeDef[] = [
  {
    name: "Carter Busse", title: "Chief Information Officer", org: "Workato",
    skills: ["leadership", "automation", "enterprise", "low-code"],
    track: "enterprise",
    eventNames: ["Workato Automation Hackathon", "Workato Automation & AI Hackathon"],
  },
  {
    name: "Stephanie Dwight", title: "Sr Director, Automations & Applications", org: "Workato",
    skills: ["automation", "operations", "low-code", "enterprise"],
    track: "enterprise",
    eventNames: ["Workato Automation Hackathon", "Workato Automation & AI Hackathon"],
  },
  {
    name: "Manoj Gaddam", title: "Director, AI Solutions", org: "Workato",
    skills: ["AI", "solutions architecture", "automation", "LLMs"],
    track: "ai",
    eventNames: ["HackAIton — Workato AI Hackathon Hyderabad"],
  },
  {
    name: "Shyam Tirumalasetty", title: "Technical Architect", org: "Workato",
    skills: ["integration", "architecture", "APIs", "automation"],
    track: "ai",
    eventNames: ["HackAIton — Workato AI Hackathon Hyderabad"],
  },
  {
    name: "Ramu Chowdan", title: "Technical Architect", org: "Workato",
    skills: ["integration", "architecture", "APIs", "automation"],
    track: "ai",
    eventNames: ["HackAIton — Workato AI Hackathon Hyderabad"],
  },
  {
    name: "Niyaz Ahmed", title: "Global Community & Education Partnership", org: "Workato",
    skills: ["community", "education", "partnerships", "automation"],
    track: "ai",
    eventNames: [
      "HackAIton — Workato AI Hackathon Hyderabad",
      "Rajalakshmi Engineering College × Workato AI Hackathon",
    ],
  },
  {
    name: "Dushyanth Vishwanath", title: "Director, Integration", org: "Infoteck Solutions",
    skills: ["integration", "consulting", "automation", "APIs"],
    track: "ai",
    eventNames: ["HackAIton — Workato AI Hackathon Hyderabad"],
  },
  {
    name: "Vignesh Rajan", title: "Solutions Architect", org: "Workato",
    skills: ["solutions architecture", "APIs", "integration"],
    track: "ai",
    eventNames: ["Workato Hack-AI-thon Berlin"],
  },
  {
    name: "Chris Wiechmann", title: "Sr Solutions Architect", org: "Workato",
    skills: ["solutions architecture", "enterprise", "automation"],
    track: "ai",
    eventNames: ["Workato Hack-AI-thon Berlin"],
  },
  {
    name: "Chaitali Patil", title: "Technical Architect", org: "Workato",
    skills: ["integration", "architecture", "APIs"],
    track: "ai",
    eventNames: ["Workato Hack-AI-thon Berlin"],
  },
  {
    name: "Mike Kiersey", title: "Senior Director, Solutions Consulting", org: "Workato",
    skills: ["solutions consulting", "enterprise", "automation"],
    track: "enterprise",
    eventNames: ["Workato Hack-AI-thon Berlin"],
  },
  {
    name: "Rafal Kaminski", title: "Corporate IT Director", org: "External",
    skills: ["IT management", "enterprise", "automation"],
    track: "enterprise",
    eventNames: ["Workato Hack-AI-thon Berlin"],
  },
  {
    name: "Kim Galant", title: "Head of Professional Services APAC", org: "Workato",
    skills: ["professional services", "APAC", "integration", "consulting"],
    track: "open",
    eventNames: ["HackRift 2025", "HackRift 2024"],
  },
];

// ── Data: Winning Teams ───────────────────────────────────────────────────────

interface WinnerDef {
  teamName: string; projectName: string; description: string;
  award: string; rank: number; prize: string;
  eventName: string; eventYear: number;
  track: "ai" | "enterprise" | "open";
  judgeNames: string[];
  scores: { innovation: number; technical: number; impact: number; presentation: number };
}

const WINNERS: WinnerDef[] = [
  // ── 2022 Internal ──────────────────────────────────────────────────────────
  {
    teamName: "Top Gears", projectName: "Gears Bot",
    description: "Internal bot solution that won the top prize at Workato's first annual employee hackathon. Recognized for overall excellence in automation design and implementation.",
    award: "Best Hack Overall", rank: 1, prize: "Cash prize (amount not disclosed)",
    eventName: "Workato Automation Hackathon", eventYear: 2022, track: "enterprise",
    judgeNames: ["Carter Busse", "Stephanie Dwight"],
    scores: { innovation: 9.2, technical: 8.8, impact: 9.0, presentation: 9.1 },
  },
  {
    teamName: "Army Ants", projectName: "Automated Recipe Review",
    description: "Automates the process of reviewing Workato recipes (automations), improving efficiency and quality control for customers by reducing manual review cycles.",
    award: "Biggest Value for Customers", rank: 2, prize: "Cash prize (amount not disclosed)",
    eventName: "Workato Automation Hackathon", eventYear: 2022, track: "enterprise",
    judgeNames: ["Carter Busse", "Stephanie Dwight"],
    scores: { innovation: 8.5, technical: 8.7, impact: 9.3, presentation: 8.2 },
  },
  {
    teamName: "Redding to Automate", projectName: "SportBot",
    description: "Creative bot related to sports automation, recognized for its novel and inventive application of the Workato platform in an unexpected domain.",
    award: "Most Innovative", rank: 3, prize: "Cash prize (amount not disclosed)",
    eventName: "Workato Automation Hackathon", eventYear: 2022, track: "enterprise",
    judgeNames: ["Carter Busse", "Stephanie Dwight"],
    scores: { innovation: 9.5, technical: 7.8, impact: 7.5, presentation: 8.0 },
  },
  {
    teamName: "Just Do It", projectName: "Memories Bot",
    description: "Fun and unconventional bot designed to capture and surface memories. Awarded for its creative originality and whimsical take on automation.",
    award: "Most Whacky", rank: 4, prize: "Cash prize (amount not disclosed)",
    eventName: "Workato Automation Hackathon", eventYear: 2022, track: "enterprise",
    judgeNames: ["Carter Busse", "Stephanie Dwight"],
    scores: { innovation: 9.0, technical: 7.0, impact: 7.2, presentation: 8.5 },
  },
  // ── 2023 Internal ──────────────────────────────────────────────────────────
  {
    teamName: "Goblet of Fire", projectName: "Eventful Pipe Gen Pack",
    description: "Streamlines event management and data pipelines within the Workato ecosystem. Automates Marketo campaigns, Zoom invites, Salesforce enrichment, event kits, and post-event ChatGPT summary decks with segmented attendee lists and lead prioritization.",
    award: "Best Overall Hack", rank: 1, prize: "Cash prize (amount not disclosed)",
    eventName: "Workato Automation & AI Hackathon", eventYear: 2023, track: "ai",
    judgeNames: ["Carter Busse", "Stephanie Dwight"],
    scores: { innovation: 9.4, technical: 9.1, impact: 9.2, presentation: 9.3 },
  },
  {
    teamName: "Team Isabelle", projectName: "Chronicler",
    description: "ChatGPT-powered solution that finds and generates documentation for Workato recipes. Users fill a form → Workato recipe triggers ChatGPT → auto-creates a Confluence page with AI summary, timestamps, creator link, and recipe link. Solves the persistent problem of undocumented automation workflows.",
    award: "Best Use Case for AI", rank: 1, prize: "Cash prize (amount not disclosed)",
    eventName: "Workato Automation & AI Hackathon", eventYear: 2023, track: "ai",
    judgeNames: ["Carter Busse", "Stephanie Dwight"],
    scores: { innovation: 9.6, technical: 9.0, impact: 8.8, presentation: 9.2 },
  },
  {
    teamName: "Ocean Pacific Peace", projectName: "Deckbot v2",
    description: "Enhanced bot for creating AI-assisted presentation decks on demand, demonstrating significant measurable value for external Workato customers in sales and marketing contexts.",
    award: "Biggest Value for Customers", rank: 1, prize: "Cash prize (amount not disclosed)",
    eventName: "Workato Automation & AI Hackathon", eventYear: 2023, track: "ai",
    judgeNames: ["Carter Busse", "Stephanie Dwight"],
    scores: { innovation: 8.7, technical: 8.9, impact: 9.4, presentation: 8.8 },
  },
  {
    teamName: "GAST Pedal", projectName: "DossNow",
    description: "Helps sales teams build prospect dossiers automatically before intake calls. Uses Google Calendar triggers to pull CRM data, LinkedIn profiles, and public domain info — delivering a complete research brief before the first meeting.",
    award: "Most Creative", rank: 1, prize: "Cash prize (amount not disclosed)",
    eventName: "Workato Automation & AI Hackathon", eventYear: 2023, track: "ai",
    judgeNames: ["Carter Busse", "Stephanie Dwight"],
    scores: { innovation: 9.3, technical: 8.5, impact: 8.9, presentation: 9.0 },
  },
  {
    teamName: "M.F.J.P.", projectName: "EventBot",
    description: "Bot designed to manage internal events end-to-end with Workato automations, recognized for delivering the most significant operational value and productivity impact for Workato's internal teams.",
    award: "Biggest Internal Use Impact", rank: 1, prize: "Cash prize (amount not disclosed)",
    eventName: "Workato Automation & AI Hackathon", eventYear: 2023, track: "ai",
    judgeNames: ["Carter Busse", "Stephanie Dwight"],
    scores: { innovation: 8.8, technical: 8.6, impact: 9.5, presentation: 8.7 },
  },
  // ── REC 2025 ───────────────────────────────────────────────────────────────
  {
    teamName: "TWO CROSS TWO", projectName: "AI-Powered Meeting Transcription & Follow-Up Automation",
    description: "Automatically transcribes meetings using AI and triggers follow-up action workflows — scheduling, task assignment, summary distribution — enhancing team productivity and accountability across the organization.",
    award: "First Place", rank: 1, prize: "INR 50,000",
    eventName: "Rajalakshmi Engineering College × Workato AI Hackathon", eventYear: 2025, track: "ai",
    judgeNames: ["Niyaz Ahmed"],
    scores: { innovation: 9.5, technical: 9.2, impact: 9.3, presentation: 9.4 },
  },
  {
    teamName: "AITHEISTS", projectName: "AI Streamlining Insurance & Patient Flow",
    description: "AI-driven solution optimizing insurance claims processing and hospital patient flow management, reducing bottlenecks and improving throughput in healthcare operations.",
    award: "Second Place", rank: 2, prize: "INR 25,000",
    eventName: "Rajalakshmi Engineering College × Workato AI Hackathon", eventYear: 2025, track: "ai",
    judgeNames: ["Niyaz Ahmed"],
    scores: { innovation: 9.1, technical: 8.9, impact: 9.2, presentation: 8.8 },
  },
  {
    teamName: "Ilaya Bharatham", projectName: "AI Transforming CSR Execution & Project Approvals",
    description: "Uses AI to improve management of Corporate Social Responsibility initiatives, including automated execution pipelines, multi-stage project approval workflows, and impact reporting.",
    award: "Third Place", rank: 3, prize: "INR 15,000",
    eventName: "Rajalakshmi Engineering College × Workato AI Hackathon", eventYear: 2025, track: "ai",
    judgeNames: ["Niyaz Ahmed"],
    scores: { innovation: 8.9, technical: 8.7, impact: 9.0, presentation: 8.6 },
  },
];

// ── Schema ────────────────────────────────────────────────────────────────────

async function applySchema(): Promise<void> {
  console.log("  applying schema additions…");

  await sql`
    CREATE TABLE IF NOT EXISTS hackathon_events (
      id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      name             text        NOT NULL,
      year             int         NOT NULL,
      date_held        date,
      location         text,
      modality         text        CHECK (modality IN ('in-person','virtual','hybrid')),
      organizer        text,
      category         text        NOT NULL
                                   CHECK (category IN ('internal','public','sponsored','university','enterprise','student')),
      theme            text,
      participant_count text,
      platform         text,
      source_url       text,
      created_at       timestamptz NOT NULL DEFAULT now(),
      UNIQUE (name, year)
    )
  `;

  await sql`ALTER TABLE teams       ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES hackathon_events(id)`;
  await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES hackathon_events(id)`;
  await sql`ALTER TABLE awards      ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES hackathon_events(id)`;

  console.log("  ✓ schema ready");
}

// ── Seed events ───────────────────────────────────────────────────────────────

async function seedEvents(): Promise<Map<string, string>> {
  console.log("  seeding hackathon_events…");
  const ids = new Map<string, string>(); // "Name:Year" → id

  for (const e of EVENTS) {
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO hackathon_events
        (name, year, date_held, location, modality, organizer, category,
         theme, participant_count, platform, source_url)
      VALUES
        (${e.name}, ${e.year}, ${e.date_held ?? null}, ${e.location}, ${e.modality},
         ${e.organizer}, ${e.category}, ${e.theme}, ${e.participant_count},
         ${e.platform}, ${e.source_url})
      ON CONFLICT (name, year) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    if (row) {
      ids.set(`${e.name}:${e.year}`, row.id);
      console.log(`    ✓ ${e.year} ${e.category.padEnd(10)} ${e.name}`);
    }
  }

  return ids;
}

// ── Seed judges ───────────────────────────────────────────────────────────────

async function seedJudges(): Promise<Map<string, string>> {
  console.log("  seeding judge registrations…");
  const ids = new Map<string, string>(); // name → registration id

  for (const j of JUDGES) {
    const email = judgeEmail(j.name);
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO registrations
        (full_name, email, challenges, track, role, team_status,
         experience_level, how_heard, agreed_to_code_of_conduct)
      VALUES
        (${j.name + " — " + j.title + " @ " + j.org}, ${email},
         ${j.skills}, ${j.track},
         'participant', 'looking', 'advanced', 'mcp', true)
      ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING id
    `;
    if (row) {
      ids.set(j.name, row.id);
      console.log(`    ✓ ${j.name}`);
    }
  }

  return ids;
}

// ── Seed winners (teams + submissions + awards + scores) ──────────────────────

async function seedWinners(
  eventIds: Map<string, string>,
  judgeIds: Map<string, string>
): Promise<void> {
  console.log("  seeding winning teams, submissions, awards, scores…");

  for (const w of WINNERS) {
    const eventKey = `${w.eventName}:${w.eventYear}`;
    const eventId = eventIds.get(eventKey);
    if (!eventId) {
      console.warn(`    ⚠ event not found: ${eventKey}`);
      continue;
    }

    // 1. Team lead registration
    const email = leadEmail(w.teamName);
    const [leadRow] = await sql<{ id: string }[]>`
      INSERT INTO registrations
        (full_name, email, challenges, track, role, team_status,
         experience_level, how_heard, agreed_to_code_of_conduct)
      VALUES
        (${w.teamName + " (team lead)"}, ${email},
         ${["automation", "AI", "Workato"]}, ${w.track},
         'participant', 'looking', 'intermediate', 'mcp', true)
      ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING id
    `;
    if (!leadRow) continue;
    const leadId = leadRow.id;

    // 2. Team
    const [teamRow] = await sql<{ id: string }[]>`
      INSERT INTO teams (name, track, member_ids, event_id, status)
      VALUES (${w.teamName}, ${w.track}, ARRAY[${leadId}]::uuid[], ${eventId}, 'formed')
      RETURNING id
    `;
    if (!teamRow) continue;
    const teamId = teamRow.id;

    // 3. team_members join row
    await sql`
      INSERT INTO team_members (registration_id, team_id)
      VALUES (${leadId}, ${teamId})
      ON CONFLICT DO NOTHING
    `;

    // 4. Submission (Neon uses project_name not title)
    const [subRow] = await sql<{ id: string }[]>`
      INSERT INTO submissions (team_id, event_id, project_name, description, status, submitted_at)
      VALUES (
        ${teamId}, ${eventId},
        ${w.projectName}, ${w.description},
        'scored', now()
      )
      RETURNING id
    `;
    if (!subRow) continue;
    const submissionId = subRow.id;

    // 5. Award (award_type is required in Neon's awards table)
    await sql`
      INSERT INTO awards (name, prize, rank, award_type, event_id, team_id, submission_id, awarded_at)
      VALUES (
        ${w.award}, ${w.prize}, ${w.rank}, ${"winner"},
        ${eventId}, ${teamId}, ${submissionId},
        now()
      )
    `;

    // 6. Scores — one row per judge (Neon uses innovation_score, quality_score, etc.)
    for (const judgeName of w.judgeNames) {
      const judgeId = judgeIds.get(judgeName);
      if (!judgeId) {
        console.warn(`    ⚠ judge not found: ${judgeName}`);
        continue;
      }
      await sql`
        INSERT INTO scores
          (submission_id, judge_id,
           innovation_score, quality_score, impact_score, platform_score,
           comments)
        VALUES
          (${submissionId}, ${judgeId},
           ${Math.round(w.scores.innovation)}, ${Math.round(w.scores.technical)},
           ${Math.round(w.scores.impact)}, ${Math.round(w.scores.presentation)},
           ${"Scored at " + w.eventName + " " + w.eventYear})
      `;
    }

    console.log(`    ✓ ${w.teamName} — "${w.projectName}" (${w.award})`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n🌱  Seeding historic Workato hackathon data…\n");

  try {
    // Guard: skip if winning teams are already seeded (events+judges upsert safely)
    const [{ count }] = await sql<{ count: string }[]>`
      SELECT count(*)::text FROM teams WHERE event_id IS NOT NULL
    `;
    if (parseInt(count) > 0) {
      console.log(`ℹ️   ${count} historic teams already exist — skipping.\n`);
      console.log("    To re-seed: DELETE FROM teams WHERE event_id IS NOT NULL; then re-run.\n");
      return;
    }

    await applySchema();
    const eventIds = await seedEvents();
    const judgeIds = await seedJudges();
    await seedWinners(eventIds, judgeIds);

    console.log(`
✅  Done.
    ${EVENTS.length} hackathon events
    ${JUDGES.length} judge registrations
    ${WINNERS.length} winning teams + submissions + awards + scores
`);
  } catch (err) {
    console.error("❌  Seed failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

void main();
