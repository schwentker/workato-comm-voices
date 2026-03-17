interface Env {
  COMM_VOICES_API_BASE_URL?: string;
  COMM_VOICES_API_TOKEN?: string;
}

const DEFAULT_API_BASE_URL = "https://workato-comm-voices.fly.dev";

export async function onRequestGet(context: { env: Env }): Promise<Response> {
  const apiBaseUrl = (context.env.COMM_VOICES_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");

  const response = await fetch(`${apiBaseUrl}/community-posts`, {
    headers: {
      Accept: "application/json",
      ...(context.env.COMM_VOICES_API_TOKEN
        ? { Authorization: `Bearer ${context.env.COMM_VOICES_API_TOKEN}` }
        : {}),
    },
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ error: `Upstream request failed with ${response.status}` }), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  return new Response(await response.text(), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
