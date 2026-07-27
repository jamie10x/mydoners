import { env } from "../config/env";
import { enqueueRetry, startNotificationWorker, type NotificationJob } from "./notificationOutbox";

// Sends a message directly via the customer bot's token (@mydoner_bot) —
// simplest path for one-off backend-initiated messages (order updates,
// location requests) that don't need customer-bot's own process involved.

async function trySend(
  chatId: number,
  text: string,
  options: { replyMarkup?: unknown; parseMode?: "HTML" } = {},
): Promise<boolean> {
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
  return res.ok;
}

/**
 * Send now; on any failure (Telegram 4xx/5xx/429, network error) the message
 * is queued in Redis and retried with backoff by the outbox worker instead
 * of being silently dropped — a missed "your order is on the way" is a real
 * customer-facing incident, not a log line.
 */
export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options: { replyMarkup?: unknown; parseMode?: "HTML" } = {},
): Promise<void> {
  const ok = await trySend(chatId, text, options).catch(() => false);
  if (!ok) {
    await enqueueRetry({
      chatId,
      text,
      parseMode: options.parseMode,
      replyMarkup: options.replyMarkup,
      attempt: 1,
    }).catch((err) => console.error("[telegram] failed to enqueue retry:", err));
  }
}

export function startTelegramRetryWorker(): void {
  startNotificationWorker((job: NotificationJob) =>
    trySend(job.chatId, job.text, { parseMode: job.parseMode, replyMarkup: job.replyMarkup }),
  );
}
