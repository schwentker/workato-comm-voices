# Workato Community Voices

**A community intelligence layer for Workato's global developer ecosystem — built with MCP, Neon, and Fly.io.**

This project demonstrates what a modern developer community infrastructure looks like when you treat community signals the same way you treat product telemetry: as structured, queryable, actionable data.

---

## What this is

An MCP (Model Context Protocol) server that gives AI agents — including Claude — real-time access to Workato's developer community across every channel where builders gather: Systematic, Reddit, Slack, and Discord.

Connect it to Claude Desktop and ask:

> *"What are developers asking about this week?"*
> *"Show me feature requests from our India community."*
> *"Which European members are most active on Systematic?"*
> *"Flag unanswered questions from the last 48 hours."*

The server aggregates posts from live sources (Reddit r/workato) and community channels, normalizes them into a unified schema, and surfaces them as MCP tools your AI can reason over.

---

## Why this matters for Workato

Workato's developer community spans 400,000+ customers across the US, Europe, India, Japan, and Brazil. The tools to *understand* that community — to surface what builders are struggling with, requesting, and celebrating — shouldn't require a data team or a dashboard refresh.

This project makes community intelligence conversational.

It also directly addresses the platform question Workato is navigating: **Systematic vs. Slack vs. Discord**. Rather than forcing a migration, this architecture aggregates all three. The platform decision becomes a routing question, not a migration crisis.

---

## Architecture

```
Claude Desktop / Agent Studio Genie
        │
        ▼ MCP (SSE)
workato-comm-voices (Fly.io)
        │
        ├── GET /community-posts
        │       ├── Reddit r/workato (live)
        │       ├── Systematic (scaffolded, pending auth)
        │       ├── Slack (synthetic)
        │       └── Discord (synthetic)
        │
        ├── MCP Tools
        │       ├── get_community_posts (platform/region/type filters)
        │       ├── register_participant
        │       ├── match_teams_by_skills
        │       ├── confirm_team_formation
        │       ├── submit_project
        │       ├── score_submission
        │       ├── trigger_awards
        │       └── get_event_status
        │
        └── Neon DB (historic Workato hackathon data)
                ├── events (HackAIton, Berlin, REC Chennai, API World...)
                ├── judges
                └── winning_projects
```

---

## MCP Tools

### Community Intelligence

**`get_community_posts`**
Fetch recent posts across all community channels.

| Parameter | Type | Options |
|-----------|------|---------|
| platform | string | systematic, discord, slack, reddit, all |
| region | string | us, europe, india, japan, brazil, all |
| type | string | question, feature_request, announcement, all |
| limit | integer | 1-50, default 10 |

### Hackathon Management

Built on historic data from Workato's own hackathon program — internal employee hackathons (2022-2024), HackAIton Hyderabad, Berlin Hack-AI-thon, REC Chennai university events, and API World sponsor tracks.

- `register_participant` — onboard a new hackathon participant
- `match_teams_by_skills` — find complementary team members by skill set
- `confirm_team_formation` — lock a team and fire onboarding recipe
- `submit_project` — record a hackathon submission
- `score_submission` — apply Workato's 100-point judging rubric
- `trigger_awards` — aggregate scores and fire awards workflow
- `get_event_status` — real-time event dashboard

---

## Stack

- **Runtime**: Node.js 20, TypeScript
- **MCP**: `@modelcontextprotocol/sdk` with SSE transport
- **Database**: Neon (serverless Postgres) via `postgres.js`
- **Deploy**: Fly.io (persistent SSE connections)
- **Community sources**: Reddit public API, Systematic (pending), synthetic Slack/Discord
- **Recipes**: Workato webhook triggers for participant onboarding, team formation, awards

---

## Live endpoints

```
https://workato-comm-voices.fly.dev/health
https://workato-comm-voices.fly.dev/sse
https://workato-comm-voices.fly.dev/community-posts
```

---

## Live Demo

https://sandboxlabs.ai/workato-comm-voices

## Screenshots

Placeholder: `docs/screenshots/` -- add after deploy

## Workato Integration

### Recipe Setup

See `docs/workato-recipes/feature-request-router.md`
Requires Workato paid plan for API Platform feature.

### Genie Setup

See `docs/workato-genies/community-intelligence-genie.md`
Connect MCP server at:
https://workato-comm-voices.fly.dev/sse

## Built For

This project was built as a demonstration of community intelligence infrastructure for the Workato Director, Global Developer Communities role. It shows what developer community operations look like when you treat community signals as structured, queryable, actionable data -- the same way Workato treats enterprise workflows.

---

## Local setup

```bash
git clone https://github.com/schwentker/workato-comm-voices
cd workato-comm-voices
nvm use 20
npm install
cp .env.example .env
# Add DATABASE_URL, WORKATO_API_TOKEN, COMM_VOICES_API_TOKEN
npm run dev
```

Test with MCP Inspector:
```bash
npx @modelcontextprotocol/inspector
# Connect to http://localhost:3000/sse
```

---

## Connect to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "workato-community": {
      "url": "https://workato-comm-voices.fly.dev/sse",
      "headers": {
        "Authorization": "Bearer YOUR_COMM_VOICES_API_TOKEN"
      }
    }
  }
}
```

---

## Community data schema

Every post, regardless of source platform, is normalized to:

```typescript
{
  id: string
  platform: "systematic" | "discord" | "slack" | "reddit"
  author: string
  region: "us" | "europe" | "india" | "japan" | "brazil" | "unknown"
  content: string
  type: "question" | "feature_request" | "announcement"
  timestamp: string // ISO 8601
  source: string    // originating fetch function
}
```

---

## Roadmap

- [ ] Systematic auth integration (OAuth or API key via Workato recipe)
- [ ] Real Slack channel connection via Slack MCP template
- [ ] Demo page at sandboxlabs.ai/workato-comm-voices
- [ ] Sentiment scoring via AI by Workato connector
- [ ] Auto-routing: feature requests → Workato product Slack channel
- [ ] Ambassador activity scoring (cross-platform contribution index)
- [ ] Weekly community digest Genie

---

## Context

Built as part of an exploration of what Workato's developer community infrastructure could look like at scale — where community signals flow into product decisions, where champions are identified by contribution data not nomination forms, and where a single AI query can surface what 400,000 builders need next.

The recipe pattern that makes Workato powerful for enterprise automation applies equally to community operations: **trigger → action → outcome**. This project treats community management as a workflow automation problem.

---

*Built by [Robert Schwentker](https://linkedin.com/in/schwentker) — Sandbox Labs AI · Contributor: Codex*
*Stack: TypeScript · MCP · Neon · Fly.io · Workato*
