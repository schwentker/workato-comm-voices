# TODO

## Tasks Completed
- Installed npm dependencies and added `@neondatabase/serverless`.
- Added `src/db/neon.ts` and centralized DB client initialization from `DATABASE_URL`.
- Added `src/webhooks/workato.ts` and refactored participant/team webhook calls to use shared helper.
- Updated `src/index.ts` to use shared Neon DB module and graceful DB shutdown helper.
- Added `submit_project` MCP tool in `src/tools/submissions.ts`.
- Moved/implemented `score_submission` in `src/tools/awards.ts`.
- Added missing MCP tools: `trigger_awards` and `get_event_status` in `src/tools/awards.ts`.
- Updated `.env.example` to include `WORKATO_AWARDS_WEBHOOK`.
- Reworked `sql/schema.sql` to include `registrations` and `team_members` plus valid FK creation order.

## Challenges Faced
- Sandbox/network restrictions initially blocked `npm install` and repo-root writes; required escalated execution.
- Local runtime is Node `12.15.0`, but project/tooling requires newer Node (repo target is Node `>=20`).
- Because of Node version mismatch, `npm run typecheck` and `npm run build` fail before TypeScript project validation.

## TODO
- Switch local/runtime environment to Node 20+.
- Re-run `npm run typecheck` and `npm run build` under Node 20+ and resolve any compiler errors if they appear.
- Run schema against Neon and verify migrations on a clean DB.
- Smoke test MCP SSE flow (`/sse`, `/messages`, `/health`) with all required tools.
- Validate award trigger behavior and webhook payload contracts with Workato recipes.
