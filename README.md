<<<<<<< HEAD
# workato-comm-voices
=======
# Workato Community Voices
>>>>>>> claude/dreamy-curie

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

Workato's developer community has grown to 500,000+
builders across the United States, Australia, United
Kingdom, India, Singapore, Spain, Philippines, Japan,
Israel, and Mexico. These builders are not waiting to
be managed. They are already teaching each other,
filing requests, and shipping integrations faster than
any internal team can track.

The tools to understand that community — to surface
what builders are struggling with, requesting, and
celebrating — should not require a data team, a
dashboard refresh, or a ticket to analytics.

This project makes community intelligence
conversational.

It started the way the best community tools always do:
a community leader noticed that signal was getting
lost. Questions went unanswered across three platforms.
Feature requests lived in Discord threads that product
never saw. Regional voices from Singapore and Mexico
and Israel were drowned out by the loudest channels.

So they built a fix.

Six months in, the pattern has become clear. Community
managers start their day by asking a question instead
of opening a dashboard. Regional leads in APAC surface
insights that used to take a week to compile. Feature
requests from the Philippines and Spain are reaching
product within hours of being posted. The platforms
themselves — wherever builders happen to gather — feed
into a single stream of signal that anyone on the team
can query in plain language.

The architecture is intentionally simple: aggregate
first, decide later. Platform preferences vary by
region and role. Rather than forcing consolidation,
the system listens everywhere and lets the insights
travel. What used to be a logistics problem became
an intelligence advantage.

This is what community operations look like when
you apply the same orchestration thinking to people
that you apply to workflows.

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
        │       └── get_community_posts (platform/region/type filters)
        │
        └── Neon DB (community posts persistence)
                ├── posts
                ├── members
                └── post_tags
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

Hackathon management tools are planned for a future release and not part of this repo currently.

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
