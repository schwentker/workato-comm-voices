import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type Sql } from "postgres";
import { z } from "zod";

import { fireWorkatoWebhook } from "../webhooks/workato.js";

interface MatchCandidate {
  name: string;
  email: string;
  skills: string[];
  track_preference: string;
}

interface TeamWebhookPayload {
  team_id: string;
  team_name: string;
  track: string;
  member_count: number;
  member_emails: string[];
  created_at: string;
}

export function registerTeamTools(server: McpServer, sql: Sql): void {
  server.tool(
    "match_teams_by_skills",
    "Find unassigned participants on the same track with complementary skills.",
    {
      participant_email: z
        .string()
        .email()
        .describe("Email of the participant looking for teammates"),
      max_results: z
        .number()
        .int()
        .min(1)
        .default(3)
        .describe("Maximum number of match candidates to return"),
    },
    async ({ participant_email, max_results }) => {
      const requesterRows = await sql<{
        id: string;
        full_name: string;
        email: string;
        challenges: string[];
        track: string;
      }[]>`
        SELECT id, full_name, email, challenges, track
        FROM registrations
        WHERE email = ${participant_email}
      `;

      if (requesterRows.length === 0) {
        return {
          content: [{ type: "text", text: `Participant not found: ${participant_email}` }],
          isError: true,
        };
      }

      const requester = requesterRows[0]!;
      const requesterSkillSet = new Set(
        (requester.challenges ?? []).map((s) => s.toLowerCase())
      );

      const candidates = await sql<{
        id: string;
        full_name: string;
        email: string;
        challenges: string[];
        track: string;
      }[]>`
        SELECT r.id, r.full_name, r.email, r.challenges, r.track
        FROM registrations r
        LEFT JOIN team_members tm ON tm.registration_id = r.id
        WHERE r.track = ${requester.track}
          AND r.email != ${participant_email}
          AND tm.team_id IS NULL
      `;

      const matches: MatchCandidate[] = [];

      for (const candidate of candidates) {
        if (matches.length >= max_results) break;

        const candidateSkills = candidate.challenges ?? [];
        const hasComplementarySkill = candidateSkills.some(
          (s) => !requesterSkillSet.has(s.toLowerCase())
        );
        if (!hasComplementarySkill) continue;

        matches.push({
          name: candidate.full_name,
          email: candidate.email,
          skills: candidateSkills,
          track_preference: candidate.track,
        });
      }

      if (matches.length === 0) {
        return {
          content: [{ type: "text", text: "No team matches found on this track yet" }],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(matches, null, 2) }],
      };
    }
  );

  server.tool(
    "confirm_team_formation",
    "Create a team, assign participants to it, and fire a Workato webhook.",
    {
      team_name: z.string().min(1).describe("Name of the team"),
      track: z.string().min(1).describe("Track the team is competing in"),
      member_emails: z
        .array(z.string().email())
        .min(1)
        .describe("Email addresses of all team members"),
    },
    async ({ team_name, track, member_emails }) => {
      const members = await sql<{
        id: string;
        email: string;
        team_id: string | null;
      }[]>`
        SELECT r.id, r.email, tm.team_id
        FROM registrations r
        LEFT JOIN team_members tm ON tm.registration_id = r.id
        WHERE r.email = ANY(${member_emails})
      `;

      const foundEmails = new Set(members.map((m) => m.email));
      const missingEmails = member_emails.filter((e) => !foundEmails.has(e));
      if (missingEmails.length > 0) {
        return {
          content: [
            { type: "text", text: `Participant(s) not found: ${missingEmails.join(", ")}` },
          ],
          isError: true,
        };
      }

      const alreadyAssigned = members.filter((m) => m.team_id !== null);
      if (alreadyAssigned.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: `Participant(s) already on a team: ${alreadyAssigned.map((m) => m.email).join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      const memberIds = members.map((m) => m.id);

      const teamRows = await sql<{ id: string; created_at: string }[]>`
        INSERT INTO teams (name, track, member_ids)
        VALUES (${team_name}, ${track}, ${memberIds})
        RETURNING id, created_at
      `;

      const team = teamRows[0];
      if (!team) {
        return {
          content: [{ type: "text", text: "Error creating team: no data returned" }],
          isError: true,
        };
      }

      await sql`
        INSERT INTO team_members ${sql(
          memberIds.map((registrationId) => ({
            registration_id: registrationId,
            team_id: team.id,
          }))
        )}
      `;

      const payload: TeamWebhookPayload = {
        team_id: team.id,
        team_name,
        track,
        member_count: memberIds.length,
        member_emails,
        created_at: team.created_at,
      };

      await fireWorkatoWebhook("WORKATO_TEAM_WEBHOOK", payload, "confirm_team_formation");

      return {
        content: [
          {
            type: "text",
            text: [
              "Team formed successfully.",
              `Team ID:      ${team.id}`,
              `Team name:    ${team_name}`,
              `Track:        ${track}`,
              `Member count: ${memberIds.length}`,
            ].join("\n"),
          },
        ],
      };
    }
  );
}
