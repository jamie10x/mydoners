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
};
