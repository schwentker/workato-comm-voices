interface Env {
  WORKATO_ROUTE_TO_PRODUCT_WEBHOOK?: string;
}

export async function onRequestPost(context: {
  env: Env;
  request: Request;
}): Promise<Response> {
  const webhookUrl = context.env.WORKATO_ROUTE_TO_PRODUCT_WEBHOOK;

  if (!webhookUrl) {
    return new Response(
      JSON.stringify({
        error: "WORKATO_ROUTE_TO_PRODUCT_WEBHOOK is not configured",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const payload = await context.request.json();
  const upstreamResponse = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Source-App": "workato-comm-voices-ui",
    },
    body: JSON.stringify(payload),
  });

  if (!upstreamResponse.ok) {
    return new Response(
      JSON.stringify({
        error: `Webhook request failed with ${upstreamResponse.status}`,
      }),
      {
        status: upstreamResponse.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
