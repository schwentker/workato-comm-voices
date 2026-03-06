/**
 * participants.ts
 *
 * Maps to the `registrations` table in the Neon DB (restored from the
 * enterprise-hack-hub Supabase backup). Column mapping:
 *
 *   Spec field        → DB column
 *   ────────────────────────────────
 *   name              → full_name
 *   skills string[]   → challenges text[]
 *   track_preference  → track
 *   registered_at     → created_at
 *   team_id           → team_members.team_id (via registration_id FK join)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import postgres, { type Sql } from "postgres";
import { z } from "zod";

// ── Constants ─────────────────────────────────────────────────────────────────

const TRACK_VALUES = ["ai", "fintech", "health", "enterprise", "open"] as const;
type Track = (typeof TRACK_VALUES)[number];

const PG_UNIQUE_VIOLATION = "23505";

// ── Webhook helper ────────────────────────────────────────────────────────────

interface ParticipantPayload {
  id: string;
  name: string;
  email: string;
  skills: string[];
  track_preference: Track;
  registration_number: number;
  registered_at: string;
}

async function fireWebhook(payload: ParticipantPayload): Promise<void> {
  const webhookUrl = process.env["WORKATO_REGISTER_WEBHOOK"];
  if (!webhookUrl) return;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(
        `[register_participant] Webhook returned ${res.status}: ${await res.text()}`
      );
    }
  } catch (err) {
    console.error("[register_participant] Webhook delivery failed:", err);
  }
}

// ── Tool registration ─────────────────────────────────────────────────────────

export function registerTools(server: McpServer, sql: Sql): void {
  // ── Tool 1: register_participant ───────────────────────────────────────────

  server.tool(
    "register_participant",
    "Register a new hackathon participant. Fires a Workato webhook on success.",
    {
      name: z.string().min(1).describe("Full name"),
      email: z.string().email().describe("Email address — must be unique"),
      skills: z
        .array(z.string().min(1))
        .min(1)
        .describe("Skill tags, e.g. ['TypeScript', 'LLMs', 'React']"),
      track_preference: z
        .enum(TRACK_VALUES)
        .describe("Preferred track: ai | fintech | health | enterprise | open"),
    },
    async ({ name, email, skills, track_preference }) => {
      try {
        const rows = await sql<{
          id: string;
          full_name: string;
          email: string;
          challenges: string[];
          track: Track;
          registration_number: number;
          created_at: string;
        }[]>`
          INSERT INTO registrations
            (full_name, email, challenges, track, role, team_status,
             experience_level, how_heard, agreed_to_code_of_conduct)
          VALUES
            (${name}, ${email}, ${skills}, ${track_preference},
             'participant', 'looking', 'intermediate', 'mcp', true)
          RETURNING id, full_name, email, challenges, track, registration_number, created_at
        `;

        const data = rows[0];
        if (!data) {
          return {
            content: [{ type: "text", text: "Registration failed: no data returned" }],
            isError: true,
          };
        }

        const payload: ParticipantPayload = {
          id: data.id,
          name: data.full_name,
          email: data.email,
          skills: data.challenges,
          track_preference: data.track,
          registration_number: data.registration_number,
          registered_at: data.created_at,
        };

        await fireWebhook(payload);

        return {
          content: [
            {
              type: "text",
              text: [
                "Participant registered successfully.",
                `ID:                  ${payload.id}`,
                `Registration number: ${payload.registration_number}`,
                `Name:                ${payload.name}`,
                `Email:               ${payload.email}`,
                `Track:               ${payload.track_preference}`,
                `Skills:              ${payload.skills.join(", ")}`,
              ].join("\n"),
            },
          ],
        };
      } catch (err) {
        if (err instanceof postgres.PostgresError && err.code === PG_UNIQUE_VIOLATION) {
          return {
            content: [{ type: "text", text: "Participant already registered" }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: `Registration failed: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  // ── Tool 2: get_participant ────────────────────────────────────────────────

  server.tool(
    "get_participant",
    "Look up a registered participant by email, including their team assignment if any.",
    {
      email: z.string().email().describe("Participant email address"),
    },
    async ({ email }) => {
      const rows = await sql<{
        id: string;
        full_name: string;
        email: string;
        challenges: string[];
        track: string;
        registration_number: number;
        created_at: string;
        team_id: string | null;
      }[]>`
        SELECT
          r.id, r.full_name, r.email, r.challenges, r.track,
          r.registration_number, r.created_at,
          tm.team_id
        FROM registrations r
        LEFT JOIN team_members tm ON tm.registration_id = r.id
        WHERE r.email = ${email}
      `;

      if (rows.length === 0) {
        return {
          content: [{ type: "text", text: "Participant not found" }],
          isError: true,
        };
      }

      const row = rows[0]!;
      const participant = {
        id: row.id,
        name: row.full_name,
        email: row.email,
        skills: row.challenges,
        track_preference: row.track,
        team_id: row.team_id,
        registration_number: row.registration_number,
        registered_at: row.created_at,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(participant, null, 2) }],
      };
    }
  );
}
