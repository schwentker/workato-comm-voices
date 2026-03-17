# Workato Comm Voices — Session Context

## Status: ✅ DEPLOYED
- **Live URL:** https://workato-comm-voices.fly.dev
- **Health:** https://workato-comm-voices.fly.dev/health → `{"status":"ok"}`
- **Community Posts:** https://workato-comm-voices.fly.dev/community-posts
- **MCP SSE:** https://workato-comm-voices.fly.dev/sse
- **DB:** Neon `enterprise-hack-hub / neondb` — fully seeded

## Files Changed This Session
| File | Change |
|------|--------|
| `src/index.ts` | Supabase → postgres.js; `DATABASE_URL` env var |
| `src/data/community-posts.ts` | **New** — hardcoded community posts dataset shared by HTTP + MCP |
| `src/tools/community-posts.ts` | **New** — `get_community_posts` tool fetches `/community-posts` and filters results |
| `src/tools/participants.ts` | Rewritten with raw SQL |
| `src/tools/teams.ts` | Rewritten with raw SQL (was a stub) |
| `src/tools/submissions.ts` | Rewritten with raw SQL |
| `src/tools/awards.ts` | Rewritten with raw SQL |
| `package.json` | `postgres@^3.4.8`; `"type":"module"`; `seed:historic` script |
| `.env.example` | `DATABASE_URL` replaces Supabase vars |
| `sql/schema.sql` | **New** — full DDL; `hackathon_events`; ALTER TABLEs for Neon compat |
| `scripts/seed-historic.ts` | **New** — seeds all historic Workato hackathon data |
| `CONTEXT.md` | **New** — this file |

## Neon Seed Data (already applied)
| Table | Rows | Notes |
|-------|------|-------|
| `hackathon_events` | 15 | 2018–2025: internal/public/sponsored/university/enterprise/student |
| `registrations` | 25 | 13 judges + 12 team leads |
| `teams` | 12 | All documented winning teams |
| `submissions` | 12 | status = "scored" |
| `awards` | 12 | prize amounts + ranks |
| `scores` | 21 | judge scores (innovation/quality/impact/platform) |

Guard: skips re-seed if `teams WHERE event_id IS NOT NULL` has rows.

## MCP Tools
| File | Tools |
|------|-------|
| `participants.ts` | `register_participant`, `get_participant` |
| `teams.ts` | `match_teams_by_skills`, `confirm_team_formation` |
| `submissions.ts` | `list_submissions`, `get_submission`, `create_submission`, `update_submission`, `score_submission`, `get_submission_scores` |
| `awards.ts` | `list_awards`, `get_award`, `create_award`, `assign_award`, `revoke_award`, `get_leaderboard` |
| `community-posts.ts` | `get_community_posts` |

## Schema Notes (Neon vs. Code)
Neon's pre-existing tables use different column names. Seeder adapted; tools may need updating:

| Table | Neon column | Tool code uses |
|-------|-------------|---------------|
| `submissions` | `project_name` | `title` |
| `submissions` | `repo_link`, `demo_link`, `video_link` | `repo_url`, `demo_url`, `video_url` |
| `scores` | `innovation_score`, `quality_score`, `impact_score`, `platform_score` | `innovation`, `technical`, `impact`, `presentation` |
| `awards` | added `name`, `prize`, `rank`, `team_id`, `notes` via ALTER TABLE | already expected these |

## Fly.io
- App: `workato-comm-voices`, region `sjc`, 2 machines (HA)
- Secrets set: `DATABASE_URL`, `PORT`, `NODE_ENV`
- Webhook secrets not yet set — add when Workato recipes are ready:
  ```
  fly secrets set WORKATO_REGISTER_WEBHOOK="..." WORKATO_TEAM_WEBHOOK="..."
  ```
