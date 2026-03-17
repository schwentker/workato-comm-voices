# Workato Comm Voices — Session Context

## Status: ✅ DEPLOYED
- **Live URL:** https://workato-comm-voices.fly.dev
- **Health:** https://workato-comm-voices.fly.dev/health → `{"status":"ok"}`
- **Community Posts:** https://workato-comm-voices.fly.dev/community-posts
- **MCP SSE:** https://workato-comm-voices.fly.dev/sse
- **DB:** Neon `enterprise-hack-hub / neondb` — community voices schema in progress

## Files Changed This Session
| File | Change |
|------|--------|
| `src/index.ts` | Supabase → postgres.js; `DATABASE_URL` env var |
| `src/data/community-posts.ts` | **New** — hardcoded community posts dataset shared by HTTP + MCP |
| `src/db/neon.ts` | Added `persistPost()` upsert for live community posts |
| `src/tools/community-posts.ts` | **New** — `get_community_posts` tool fetches `/community-posts` and filters results |
| `src/sources/reddit.ts` | Live Reddit fetch now persists posts into Neon |
| `src/tools/participants.ts` | Rewritten with raw SQL |
| `src/tools/teams.ts` | Rewritten with raw SQL (was a stub) |
| `src/tools/submissions.ts` | Rewritten with raw SQL |
| `src/tools/awards.ts` | Rewritten with raw SQL |
| `package.json` | `postgres@^3.4.8`; `"type":"module"`; `seed:historic`; `db:setup` |
| `.env.example` | `DATABASE_URL` replaces Supabase vars |
| `sql/schema_comm_voices.sql` | **New** — `posts`, `members`, `post_tags` tables + indexes |
| `sql/schema.sql` | Removed old hackathon schema |
| `scripts/seed-historic.ts` | **New** — seeds all historic Workato hackathon data |
| `CONTEXT.md` | **New** — this file |

## Community Voices Schema
- New schema contains `posts`, `members`, and `post_tags`.
- Old hackathon schema was removed and will be rebuilt later if needed.
- `persistPost()` wires live Reddit posts into the `posts` table via upsert.
- Next steps: seed the `members` table and add Systematic auth.

## Fly.io
- App: `workato-comm-voices`, region `sjc`, 2 machines (HA)
- Secrets set: `DATABASE_URL`, `PORT`, `NODE_ENV`
- Webhook secrets not yet set — add when Workato recipes are ready:
  ```
  fly secrets set WORKATO_REGISTER_WEBHOOK="..." WORKATO_TEAM_WEBHOOK="..."
  ```
