function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  botToken: required("COURIER_BOT_TOKEN"),
  courierChatId: Number(required("COURIER_CHAT_ID")),
  backendUrl: process.env.BACKEND_URL ?? "http://localhost:3000",
  courierBotApiKey: required("COURIER_BOT_API_KEY"),

  // "polling" (default, simplest for local dev — see docs/decisions.md #5)
  // or "webhook" (production — needs PUBLIC_WEBHOOK_URL reachable over HTTPS).
  botMode: (process.env.BOT_MODE ?? "polling") as "polling" | "webhook",
  webhookPort: Number(process.env.WEBHOOK_PORT ?? 3001),
  webhookPath: process.env.WEBHOOK_PATH ?? "/telegram-webhook",
  publicWebhookUrl: process.env.PUBLIC_WEBHOOK_URL ?? "",
};
