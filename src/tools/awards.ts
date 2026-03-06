import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type Sql } from "postgres";
import { z } from "zod";

import { fireWorkatoWebhook } from "../webhooks/workato.js";

const STANDARD_AWARD_NAMES = ["1st Place", "2nd Place", "3rd Place"] as const;

export function registerAwardTools(server: McpServer, sql: Sql): void {
  server.tool(
    "score_submission",
    "Record a score for a submission",
    {
      submission_id: z.string().uuid().describe("Submission UUID"),
      judge_id: z.string().uuid().describe("Judge registration UUID"),
      innovation: z.number().min(0).max(10).describe("Innovation score (0-10)"),
      technical: z.number().min(0).max(10).describe("Technical execution score (0-10)"),
      impact: z.number().min(0).max(10).describe("Business impact score (0-10)"),
      presentation: z.number().min(0).max(10).describe("Presentation score (0-10)"),
      notes: z.string().optional().describe("Judge's notes or feedback"),
    },
    async ({ submission_id, judge_id, innovation, technical, impact, presentation, notes }) => {
      const total = innovation + technical + impact + presentation;

      const rows = await sql`
        INSERT INTO scores
          (submission_id, judge_id, innovation, technical, impact, presentation, total, notes)
        VALUES
          (${submission_id}, ${judge_id}, ${innovation}, ${technical}, ${impact}, ${presentation}, ${total}, ${notes ?? null})
        ON CONFLICT (submission_id, judge_id) DO UPDATE SET
          innovation   = EXCLUDED.innovation,
          technical    = EXCLUDED.technical,
          impact       = EXCLUDED.impact,
          presentation = EXCLUDED.presentation,
          total        = EXCLUDED.total,
          notes        = EXCLUDED.notes
        RETURNING *
      `;

      return {
        content: [{ type: "text", text: JSON.stringify(rows[0], null, 2) }],
      };
    }
  );

  server.tool(
    "trigger_awards",
    "Compute winners from scored submissions and assign top awards.",
    {
      event_id: z.string().uuid().optional().describe("Optional hackathon event UUID"),
      top_n: z.number().int().min(1).max(3).default(3).describe("Number of top winners to award"),
    },
    async ({ event_id, top_n }) => {
      const leaderboard = await sql<{
        submission_id: string;
        submission_title: string;
        team_id: string;
        team_name: string;
        average_total: number;
        judge_count: number;
      }[]>`
        SELECT
          s.id AS submission_id,
          s.title AS submission_title,
          t.id AS team_id,
          t.name AS team_name,
          ROUND(AVG(sc.total)::numeric, 2) AS average_total,
          COUNT(sc.id)::int AS judge_count
        FROM submissions s
        JOIN teams t ON t.id = s.team_id
        JOIN scores sc ON sc.submission_id = s.id
        WHERE ${event_id ? sql`s.event_id = ${event_id}` : sql`TRUE`}
        GROUP BY s.id, s.title, t.id, t.name
        ORDER BY average_total DESC
        LIMIT ${top_n}
      `;

      if (leaderboard.length === 0) {
        return {
          content: [{ type: "text", text: "No scored submissions found to award" }],
          isError: true,
        };
      }

      const assignments: Array<{
        award_name: string;
        rank: number;
        team_id: string;
        team_name: string;
        submission_id: string;
        submission_title: string;
        average_total: number;
      }> = [];

      for (let i = 0; i < leaderboard.length; i += 1) {
        const winner = leaderboard[i]!;
        const rank = i + 1;
        const awardName = STANDARD_AWARD_NAMES[i] ?? `Top ${rank}`;

        const existing = await sql<{ id: string }[]>`
          SELECT id
          FROM awards
          WHERE name = ${awardName}
            AND (
              (${event_id ?? null}::uuid IS NULL AND event_id IS NULL)
              OR event_id = ${event_id ?? null}
            )
          ORDER BY created_at ASC
          LIMIT 1
        `;

        if (existing.length > 0) {
          await sql`
            UPDATE awards
            SET
              rank = ${rank},
              team_id = ${winner.team_id},
              submission_id = ${winner.submission_id},
              notes = ${`Auto-assigned by trigger_awards with average score ${winner.average_total}`},
              awarded_at = now()
            WHERE id = ${existing[0]!.id}
          `;
        } else {
          await sql`
            INSERT INTO awards (name, rank, event_id, team_id, submission_id, notes, awarded_at)
            VALUES (
              ${awardName},
              ${rank},
              ${event_id ?? null},
              ${winner.team_id},
              ${winner.submission_id},
              ${`Auto-assigned by trigger_awards with average score ${winner.average_total}`},
              now()
            )
          `;
        }

        assignments.push({
          award_name: awardName,
          rank,
          team_id: winner.team_id,
          team_name: winner.team_name,
          submission_id: winner.submission_id,
          submission_title: winner.submission_title,
          average_total: winner.average_total,
        });
      }

      await fireWorkatoWebhook(
        "WORKATO_AWARDS_WEBHOOK",
        { event_id: event_id ?? null, assignments },
        "trigger_awards"
      );

      return {
        content: [{ type: "text", text: JSON.stringify({ assignments }, null, 2) }],
      };
    }
  );

  server.tool(
    "get_event_status",
    "Get high-level event status including team, submission, scoring, and awards metrics.",
    {
      event_id: z.string().uuid().optional().describe("Optional hackathon event UUID"),
    },
    async ({ event_id }) => {
      const [participants, teams, submissionsByStatus, scoreCount, awardsCount] = await Promise.all([
        sql<{ total: number }[]>`
          SELECT COUNT(*)::int AS total FROM registrations
        `,
        sql<{ total: number }[]>`
          SELECT COUNT(*)::int AS total
          FROM teams
          WHERE ${event_id ? sql`event_id = ${event_id}` : sql`TRUE`}
        `,
        sql<{ status: string; count: number }[]>`
          SELECT status, COUNT(*)::int AS count
          FROM submissions
          WHERE ${event_id ? sql`event_id = ${event_id}` : sql`TRUE`}
          GROUP BY status
        `,
        sql<{ total: number }[]>`
          SELECT COUNT(sc.id)::int AS total
          FROM scores sc
          JOIN submissions s ON s.id = sc.submission_id
          WHERE ${event_id ? sql`s.event_id = ${event_id}` : sql`TRUE`}
        `,
        sql<{ total: number }[]>`
          SELECT COUNT(*)::int AS total
          FROM awards
          WHERE ${event_id ? sql`event_id = ${event_id}` : sql`TRUE`}
            AND awarded_at IS NOT NULL
        `,
      ]);

      const status = {
        event_id: event_id ?? null,
        participant_count: participants[0]?.total ?? 0,
        team_count: teams[0]?.total ?? 0,
        submissions: submissionsByStatus,
        score_count: scoreCount[0]?.total ?? 0,
        awarded_count: awardsCount[0]?.total ?? 0,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
      };
    }
  );

  server.tool(
    "list_awards",
    "List all hackathon awards and prizes",
    {
      limit: z.number().int().min(1).max(100).optional().describe("Max results to return (default 50)"),
      offset: z.number().int().min(0).optional().describe("Pagination offset"),
    },
    async ({ limit = 50, offset = 0 }) => {
      const rows = await sql`
        SELECT a.*, t.name AS team_name, s.title AS submission_title
        FROM awards a
        LEFT JOIN teams t ON t.id = a.team_id
        LEFT JOIN submissions s ON s.id = a.submission_id
        ORDER BY a.rank ASC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `;

      return {
        content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      };
    }
  );

  server.tool(
    "get_leaderboard",
    "Get the current hackathon leaderboard ranked by average scores",
    {
      limit: z.number().int().min(1).max(50).optional().describe("Number of teams to show (default 10)"),
    },
    async ({ limit = 10 }) => {
      const rows = await sql`
        SELECT
          s.id          AS submission_id,
          s.title,
          t.id          AS team_id,
          t.name        AS team_name,
          ROUND(AVG(sc.total)::numeric, 2) AS average_total,
          COUNT(sc.id)::int                AS judge_count
        FROM submissions s
        JOIN teams t  ON t.id  = s.team_id
        JOIN scores sc ON sc.submission_id = s.id
        GROUP BY s.id, s.title, t.id, t.name
        ORDER BY average_total DESC
        LIMIT ${limit}
      `;

      const leaderboard = rows.map((row, idx) => ({ rank: idx + 1, ...row }));

      return {
        content: [{ type: "text", text: JSON.stringify(leaderboard, null, 2) }],
      };
    }
  );
}
