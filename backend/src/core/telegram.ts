import { env } from "../config/env";

// Sends a message directly via the customer bot's token (@mydoner_bot) —
// simplest path for one-off backend-initiated messages (order updates,
// location requests) that don't need customer-bot's own process involved.
export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options: { replyMarkup?: unknown; parseMode?: "HTML" } = {},
): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options.parseMode,
      reply_markup: options.replyMarkup,
    }),
  });
  if (!res.ok) console.error(`[telegram] sendMessage failed for chat ${chatId}:`, await res.text());
}
