import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

import { closeNeonClient, getNeonClient } from "./db/neon.js";
import { COMMUNITY_PLATFORMS, COMMUNITY_REGIONS, COMMUNITY_TYPES } from "./data/community-posts.js";
import { getCommunityPosts } from "./sources/community-posts.js";
import { registerTools as registerParticipantTools } from "./tools/participants.js";
import { registerTeamTools } from "./tools/teams.js";
import { registerSubmissionTools } from "./tools/submissions.js";
import { registerAwardTools } from "./tools/awards.js";
import { registerCommunityTools } from "./tools/community-posts.js";

const PORT = parseInt(process.env["PORT"] ?? "3000", 10);
const WORKATO_API_TOKEN = process.env["WORKATO_API_TOKEN"];
const COMM_VOICES_API_TOKEN = process.env["COMM_VOICES_API_TOKEN"];
const db = getNeonClient();

const mcp = new McpServer({
  name: "workato-comm-voices",
  version: "1.0.0",
});

registerParticipantTools(mcp, db);
registerTeamTools(mcp, db);
registerSubmissionTools(mcp, db);
registerAwardTools(mcp, db);
registerCommunityTools(mcp);

const app = express();
app.use(express.json());
app.locals["workatoApiToken"] = WORKATO_API_TOKEN;
app.locals["commVoicesApiToken"] = COMM_VOICES_API_TOKEN;

function requireBearerAuth(req: Request, res: Response): boolean {
  if (!COMM_VOICES_API_TOKEN) {
    return true;
  }

  const authorization = req.header("authorization");
  const expectedAuthorization = `Bearer ${COMM_VOICES_API_TOKEN}`;

  if (authorization === expectedAuthorization) {
    return true;
  }

  res.status(401).json({ error: "Unauthorized" });
  return false;
}

function getAllowedQueryValue<T extends readonly string[]>(
  value: unknown,
  allowedValues: T
): T[number] {
  return typeof value === "string" && allowedValues.includes(value) ? value as T[number] : "all" as T[number];
}

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/community-posts", async (req: Request, res: Response) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const platform = getAllowedQueryValue(req.query["platform"], COMMUNITY_PLATFORMS);
  const region = getAllowedQueryValue(req.query["region"], COMMUNITY_REGIONS);
  const type = getAllowedQueryValue(req.query["type"], COMMUNITY_TYPES);
  const limitParam = typeof req.query["limit"] === "string" ? Number.parseInt(req.query["limit"], 10) : undefined;

  const posts = await getCommunityPosts({
    platform,
    region,
    type,
    ...(limitParam && limitParam > 0 ? { limit: limitParam } : {}),
  });

  res.type("application/json").status(200).json(posts);
});

const transports = new Map<string, SSEServerTransport>();

app.get("/sse", async (_req: Request, res: Response) => {
  if (!requireBearerAuth(_req, res)) {
    return;
  }

  const transport = new SSEServerTransport("/messages", res);
  transports.set(transport.sessionId, transport);

  res.on("close", () => {
    transports.delete(transport.sessionId);
  });

  await mcp.connect(transport);
});

app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query["sessionId"] as string | undefined;

  if (!sessionId) {
    res.status(400).json({ error: "Missing sessionId query parameter" });
    return;
  }

  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: `No active session for sessionId: ${sessionId}` });
    return;
  }

  await transport.handlePostMessage(req, res);
});

const server = app.listen(PORT, () => {
  const toolCount = (mcp as unknown as { _registeredTools: Record<string, unknown> })._registeredTools
    ? Object.keys((mcp as unknown as { _registeredTools: Record<string, unknown> })._registeredTools).length
    : "unknown";

  console.log(`[workato-comm-voices] Listening on port ${PORT}`);
  console.log(`[workato-comm-voices] Registered tools: ${toolCount}`);
  console.log(`[workato-comm-voices] SSE endpoint:  GET  http://localhost:${PORT}/sse`);
  console.log(`[workato-comm-voices] Message endpoint: POST http://localhost:${PORT}/messages`);
  console.log(`[workato-comm-voices] Health endpoint:  GET  http://localhost:${PORT}/health`);
  console.log(`[workato-comm-voices] Community endpoint: GET  http://localhost:${PORT}/community-posts`);
});

process.on("SIGTERM", () => {
  console.log("[workato-comm-voices] SIGTERM received - shutting down gracefully");
  server.close(() => {
    console.log("[workato-comm-voices] HTTP server closed");
    void closeNeonClient();
    process.exit(0);
  });
});
