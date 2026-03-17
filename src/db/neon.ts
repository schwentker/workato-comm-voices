import postgres, { type Sql } from "postgres";
import { type CommunityPost } from "../data/community-posts.js";

let dbClient: Sql | undefined;

function getDatabaseUrl(): string {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("Missing required env var: DATABASE_URL");
  }
  return databaseUrl;
}

export function getNeonClient(): Sql {
  if (!dbClient) {
    dbClient = postgres(getDatabaseUrl(), { ssl: "require" });
  }
  return dbClient;
}

export async function closeNeonClient(): Promise<void> {
  if (!dbClient) return;
  await dbClient.end();
  dbClient = undefined;
}

export async function persistPost(post: CommunityPost): Promise<void> {
  const db = getNeonClient();

  await db`
    INSERT INTO posts (
      id,
      platform,
      author,
      region,
      content,
      type,
      timestamp,
      source
    ) VALUES (
      ${post.id},
      ${post.platform},
      ${post.author},
      ${post.region},
      ${post.content},
      ${post.type},
      ${post.timestamp},
      ${post.platform}
    )
    ON CONFLICT (id) DO UPDATE SET
      platform = EXCLUDED.platform,
      author = EXCLUDED.author,
      region = EXCLUDED.region,
      content = EXCLUDED.content,
      type = EXCLUDED.type,
      timestamp = EXCLUDED.timestamp,
      source = EXCLUDED.source
  `;
}
