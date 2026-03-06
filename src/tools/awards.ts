import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type Sql } from "postgres";
import { z } from "zod";

export function registerAwardTools(server: McpServer, sql: Sql): void {
  // ── list_awards ────────────────────────────────────────────────────────────

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

  // ── get_award ──────────────────────────────────────────────────────────────

  server.tool(
    "get_award",
    "Get a single award by ID",
    {
      id: z.string().uuid().describe("Award UUID"),
    },
    async ({ id }) => {
      const rows = await sql`
        SELECT
          a.*,
          s.title AS submission_title,
          t.name AS team_name,
          json_agg(
            json_build_object('full_name', r.full_name)
          ) FILTER (WHERE r.id IS NOT NULL) AS team_members
        FROM awards a
        LEFT JOIN submissions s ON s.id = a.submission_id
        LEFT JOIN teams t ON t.id = a.team_id
        LEFT JOIN team_members tm ON tm.team_id = t.id
        LEFT JOIN registrations r ON r.id = tm.registration_id
        WHERE a.id = ${id}
        GROUP BY a.id, s.title, t.name
      `;

      if (rows.length === 0) {
        return {
          content: [{ type: "text", text: "Award not found" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(rows[0], null, 2) }],
      };
    }
  );

  // ── create_award ───────────────────────────────────────────────────────────

  server.tool(
    "create_award",
    "Create a new award category",
    {
      name: z.string().min(1).describe("Award name (e.g. 'Best AI Integration', 'Most Innovative')"),
      description: z.string().optional().describe("Award description"),
      prize: z.string().optional().describe("Prize description (e.g. '$500', 'Trophy + recognition')"),
      rank: z.number().int().min(1).optional().describe("Display rank/order for this award"),
    },
    async ({ name, description, prize, rank }) => {
      const rows = await sql`
        INSERT INTO awards (name, description, prize, rank)
        VALUES (${name}, ${description ?? null}, ${prize ?? null}, ${rank ?? null})
        RETURNING *
      `;

      return {
        content: [{ type: "text", text: JSON.stringify(rows[0], null, 2) }],
      };
    }
  );

  // ── assign_award ───────────────────────────────────────────────────────────

  server.tool(
    "assign_award",
    "Assign an award to a team and their submission",
    {
      award_id: z.string().uuid().describe("Award UUID"),
      team_id: z.string().uuid().describe("Winning team UUID"),
      submission_id: z.string().uuid().describe("Winning submission UUID"),
      notes: z.string().optional().describe("Judges' notes or reason for selection"),
    },
    async ({ award_id, team_id, submission_id, notes }) => {
      const rows = await sql`
        UPDATE awards
        SET
          team_id       = ${team_id},
          submission_id = ${submission_id},
          notes         = ${notes ?? null},
          awarded_at    = now()
        WHERE id = ${award_id}
        RETURNING *
      `;

      if (rows.length === 0) {
        return {
          content: [{ type: "text", text: "Award not found" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(rows[0], null, 2) }],
      };
    }
  );

  // ── revoke_award ───────────────────────────────────────────────────────────

  server.tool(
    "revoke_award",
    "Remove a team assignment from an award",
    {
      award_id: z.string().uuid().describe("Award UUID"),
    },
    async ({ award_id }) => {
      const rows = await sql`
        UPDATE awards
        SET team_id = NULL, submission_id = NULL, notes = NULL, awarded_at = NULL
        WHERE id = ${award_id}
        RETURNING *
      `;

      if (rows.length === 0) {
        return {
          content: [{ type: "text", text: "Award not found" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(rows[0], null, 2) }],
      };
    }
  );

  // ── get_leaderboard ────────────────────────────────────────────────────────

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
