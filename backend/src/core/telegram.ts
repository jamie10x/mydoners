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

// --- Live location -------------------------------------------------------
//
// These deliberately do NOT go through the retry outbox. NotificationJob is
// text-only, and more importantly its backoff runs out to an hour — replaying
// a courier position from 30 minutes ago onto a live-location bubble is worse
// than dropping it. Position updates are self-healing: the next one arrives
// within seconds, and the Mini App's own polling covers the gap.

type TelegramResponse<T> = { ok: true; result: T } | { ok: false; description?: string };

async function callTelegram<T>(method: string, body: Record<string, unknown>): Promise<TelegramResponse<T>> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as TelegramResponse<T>;
  } catch (err) {
    console.error(`[telegram] ${method} request failed:`, err);
    return { ok: false, description: String(err) };
  }
}

/**
 * Opens a live-location message in the customer's chat. Telegram animates the
 * pin in place for `livePeriod` seconds, so the customer can watch the courier
 * approach without ever opening the Mini App.
 *
 * Returns the message_id to edit later, or null if the send failed.
 */
export async function sendTelegramLocation(
  chatId: number,
  latitude: number,
  longitude: number,
  options: { livePeriod?: number; proximityAlertRadius?: number } = {},
): Promise<number | null> {
  const response = await callTelegram<{ message_id: number }>("sendLocation", {
    chat_id: chatId,
    latitude,
    longitude,
    live_period: options.livePeriod,
    proximity_alert_radius: options.proximityAlertRadius,
  });
  if (!response.ok) {
    console.error(`[telegram] sendLocation failed for chat ${chatId}:`, response.description);
    return null;
  }
  return response.result.message_id;
}

export type LiveEditOutcome = "ok" | "not_modified" | "expired" | "failed";

/**
 * Moves an existing live-location pin.
 *
 * The outcome is classified rather than boolean because it drives state: an
 * "expired" message (customer deleted it, live_period lapsed, or bot blocked)
 * means the stored message_id is dead and must be cleared, whereas
 * "not_modified" just means the courier hasn't moved and is entirely benign.
 */
export async function editTelegramLiveLocation(
  chatId: number,
  messageId: number,
  latitude: number,
  longitude: number,
): Promise<LiveEditOutcome> {
  const response = await callTelegram("editMessageLiveLocation", {
    chat_id: chatId,
    message_id: messageId,
    latitude,
    longitude,
  });
  if (response.ok) return "ok";

  const description = (response.description ?? "").toLowerCase();
  if (description.includes("not modified")) return "not_modified";
  if (
    description.includes("message to edit not found") ||
    description.includes("message can't be edited") ||
    description.includes("message_id_invalid") ||
    description.includes("bot was blocked")
  ) {
    return "expired";
  }
  console.error(`[telegram] editMessageLiveLocation failed for chat ${chatId}:`, response.description);
  return "failed";
}

export async function stopTelegramLiveLocation(chatId: number, messageId: number): Promise<void> {
  const response = await callTelegram("stopMessageLiveLocation", { chat_id: chatId, message_id: messageId });
  // A already-stopped or already-expired pin is a no-op, not an error worth
  // surfacing — the goal state (not live) is reached either way.
  if (!response.ok) {
    console.warn(`[telegram] stopMessageLiveLocation for chat ${chatId}:`, response.description);
  }
}
