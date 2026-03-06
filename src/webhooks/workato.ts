export async function fireWorkatoWebhook(
  envVarName: string,
  payload: unknown,
  context: string
): Promise<void> {
  const webhookUrl = process.env[envVarName];
  if (!webhookUrl) return;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`[${context}] Webhook returned ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error(`[${context}] Webhook delivery failed:`, err);
  }
}
