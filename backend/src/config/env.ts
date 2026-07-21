function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL"),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  courierBotApiKey: process.env.COURIER_BOT_API_KEY ?? "",
};
