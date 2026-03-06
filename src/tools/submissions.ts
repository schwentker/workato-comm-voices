import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type Sql } from "postgres";
import { z } from "zod";

const SubmissionStatus = z.enum(["draft", "submitted", "under_review", "scored"]);

export function registerSubmissionTools(server: McpServer, sql: Sql): void {
  // ── list_submissions ───────────────────────────────────────────────────────

  server.tool(
    "list_submissions",
    "List all hackathon project submissions",
    {
      limit: z.number().int().min(1).max(100).optional().describe("Max results to return (default 50)"),
      offset: z.number().int().min(0).optional().describe("Pagination offset"),
      status: SubmissionStatus.optional().describe("Filter by submission status"),
      team_id: z.string().uuid().optional().describe("Filter by team ID"),
    },
    async ({ limit = 50, offset = 0, status, team_id }) => {
      const rows = await sql`
        SELECT s.*, t.name AS team_name
        FROM submissions s
        LEFT JOIN teams t ON t.id = s.team_id
        WHERE TRUE
          ${status !== undefined ? sql`AND s.status = ${status}` : sql``}
          ${team_id !== undefined ? sql`AND s.team_id = ${team_id}` : sql``}
        ORDER BY s.submitted_at DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `;

      return {
        content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      };
    }
  );

  // ── get_submission ─────────────────────────────────────────────────────────

  server.tool(
    "get_submission",
    "Get a single submission by ID",
    {
      id: z.string().uuid().describe("Submission UUID"),
    },
    async ({ id }) => {
      const rows = await sql`
        SELECT
          s.*,
          t.name AS team_name,
          json_agg(
            json_build_object('full_name', r.full_name, 'email', r.email)
          ) FILTER (WHERE r.id IS NOT NULL) AS team_members
        FROM submissions s
        LEFT JOIN teams t ON t.id = s.team_id
        LEFT JOIN team_members tm ON tm.team_id = t.id
        LEFT JOIN registrations r ON r.id = tm.registration_id
        WHERE s.id = ${id}
        GROUP BY s.id, t.name
      `;

      if (rows.length === 0) {
        return {
          content: [{ type: "text", text: "Submission not found" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(rows[0], null, 2) }],
      };
    }
  );

  // ── create_submission ──────────────────────────────────────────────────────

  server.tool(
    "create_submission",
    "Create a new project submission for a team",
    {
      team_id: z.string().uuid().describe("Team UUID"),
      title: z.string().min(1).describe("Project title"),
      description: z.string().min(1).describe("Project description"),
      repo_url: z.string().url().optional().describe("GitHub or repository URL"),
      demo_url: z.string().url().optional().describe("Live demo URL"),
      video_url: z.string().url().optional().describe("Demo video URL"),
    },
    async ({ team_id, title, description, repo_url, demo_url, video_url }) => {
      const rows = await sql`
        INSERT INTO submissions (team_id, title, description, repo_url, demo_url, video_url, status)
        VALUES (
          ${team_id}, ${title}, ${description},
          ${repo_url ?? null}, ${demo_url ?? null}, ${video_url ?? null},
          'draft'
        )
        RETURNING *
      `;

      return {
        content: [{ type: "text", text: JSON.stringify(rows[0], null, 2) }],
      };
    }
  );

  // ── update_submission ──────────────────────────────────────────────────────

  server.tool(
    "update_submission",
    "Update an existing submission",
    {
      id: z.string().uuid().describe("Submission UUID"),
      title: z.string().min(1).optional().describe("Project title"),
      description: z.string().min(1).optional().describe("Project description"),
      repo_url: z.string().url().optional().describe("GitHub or repository URL"),
      demo_url: z.string().url().optional().describe("Live demo URL"),
      video_url: z.string().url().optional().describe("Demo video URL"),
      status: SubmissionStatus.optional().describe("Submission status"),
    },
    async ({ id, title, description, repo_url, demo_url, video_url, status }) => {
      const updates: Record<string, string | null> = {};
      if (title !== undefined) updates["title"] = title;
      if (description !== undefined) updates["description"] = description;
      if (repo_url !== undefined) updates["repo_url"] = repo_url;
      if (demo_url !== undefined) updates["demo_url"] = demo_url;
      if (video_url !== undefined) updates["video_url"] = video_url;
      if (status !== undefined) updates["status"] = status;

      if (Object.keys(updates).length === 0) {
        return {
          content: [{ type: "text", text: "No fields to update" }],
          isError: true,
        };
      }

      // Append submitted_at = now() when transitioning to submitted
      const rows = status === "submitted"
        ? await sql`
            UPDATE submissions
            SET ${sql(updates)}, submitted_at = now()
            WHERE id = ${id}
            RETURNING *
          `
        : await sql`
            UPDATE submissions
            SET ${sql(updates)}
            WHERE id = ${id}
            RETURNING *
          `;

      if (rows.length === 0) {
        return {
          content: [{ type: "text", text: "Submission not found" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(rows[0], null, 2) }],
      };
    }
  );

  // ── score_submission ───────────────────────────────────────────────────────

  server.tool(
    "score_submission",
    "Record a score for a submission",
    {
      submission_id: z.string().uuid().describe("Submission UUID"),
      judge_id: z.string().uuid().describe("Judge registration UUID"),
      innovation: z.number().min(0).max(10).describe("Innovation score (0–10)"),
      technical: z.number().min(0).max(10).describe("Technical execution score (0–10)"),
      impact: z.number().min(0).max(10).describe("Business impact score (0–10)"),
      presentation: z.number().min(0).max(10).describe("Presentation score (0–10)"),
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

  // ── get_submission_scores ──────────────────────────────────────────────────

  server.tool(
    "get_submission_scores",
    "Get all scores for a submission with averages",
    {
      submission_id: z.string().uuid().describe("Submission UUID"),
    },
    async ({ submission_id }) => {
      const rows = await sql<{
        id: string;
        submission_id: string;
        judge_id: string;
        innovation: number;
        technical: number;
        impact: number;
        presentation: number;
        total: number;
        notes: string | null;
        created_at: string;
        judge_name: string | null;
      }[]>`
        SELECT s.*, r.full_name AS judge_name
        FROM scores s
        LEFT JOIN registrations r ON r.id = s.judge_id
        WHERE s.submission_id = ${submission_id}
      `;

      if (rows.length === 0) {
        return {
          content: [{ type: "text", text: "No scores recorded yet for this submission" }],
        };
      }

      type NumericField = "innovation" | "technical" | "impact" | "presentation" | "total";
      const avg = (field: NumericField): number =>
        rows.reduce((sum, row) => sum + Number(row[field]), 0) / rows.length;

      const averages = {
        innovation: avg("innovation"),
        technical: avg("technical"),
        impact: avg("impact"),
        presentation: avg("presentation"),
        total: avg("total"),
        judge_count: rows.length,
      };

      return {
        content: [
          { type: "text", text: JSON.stringify({ scores: rows, averages }, null, 2) },
        ],
      };
    }
  );
}
