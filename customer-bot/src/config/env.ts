function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  botToken: required("TELEGRAM_BOT_TOKEN"),
  miniAppUrl: process.env.MINI_APP_URL ?? "https://mydoners.uz",
  backendUrl: process.env.BACKEND_URL ?? "http://localhost:3000",
  customerBotApiKey: required("CUSTOMER_BOT_API_KEY"),

  // "polling" (default, no public endpoint needed, simplest for local dev)
  // or "webhook" (production — needs a real HTTPS URL Telegram can reach).
  // Mirrors courier-bot's BOT_MODE — see docs/decisions.md #5.
  botMode: (process.env.BOT_MODE ?? "polling") as "polling" | "webhook",
  webhookPort: Number(process.env.WEBHOOK_PORT ?? 3002),
  webhookPath: process.env.WEBHOOK_PATH ?? "/telegram-webhook",
  publicWebhookUrl: process.env.PUBLIC_WEBHOOK_URL ?? "",
};
