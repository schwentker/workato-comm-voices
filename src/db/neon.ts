import postgres, { type Sql } from "postgres";

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
