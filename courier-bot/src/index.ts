import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import type { CourierAssignedData } from "@mydoners/shared-contracts";
import { env } from "./config/env";
import { registerCallbackHandlers } from "./handlers/callbacks";
import { connectToBackend } from "./ws/socketClient";
import { formatOrderCard, orderKeyboard } from "./orderCard";
import { courierState } from "./state/pendingDeliveries";
import { backendClient } from "./backend/client";

const bot = new Bot(env.botToken);

registerCallbackHandlers(bot);

/**
 * Sends the dispatch card + native location pin, records local state, and
 * marks the order notified in the backend DB. Shared by the WS fast path
 * and the backfill loop so a dispatch is sent exactly once no matter which
 * path gets there first.
 */
async function dispatchOrder(orderId: number, data: CourierAssignedData): Promise<void> {
  const message = await bot.api.sendMessage(env.courierChatId, formatOrderCard(orderId, data), {
    parse_mode: "HTML",
    reply_markup: orderKeyboard(orderId, data.latitude, data.longitude),
  });
  courierState.recordAssignment(orderId, data, message.message_id);

  // Native Telegram location bubble alongside the text card — tapping it
  // opens the courier's own default maps app directly, on top of the
  // explicit Yandex/Google Maps buttons already in orderKeyboard().
  await bot.api
    .sendLocation(env.courierChatId, data.latitude, data.longitude)
    .catch((err) => console.error(`Failed to send location pin for order ${orderId}:`, err));

  // Only after the card actually reached Telegram — if this crashes before
  // here, the backfill loop re-sends on the next tick instead of losing it.
  await backendClient
    .markCourierNotified(orderId)
    .catch((err) => console.error(`Failed to mark order ${orderId} courier-notified:`, err));
}

connectToBackend((payload) => {
  const { orderId, data } = payload;
  if (courierState.has(orderId)) return; // backfill got there first
  dispatchOrder(orderId, data).catch((err) =>
    console.error(`Failed to send dispatch message for order ${orderId}:`, err),
  );
});

// Recovery loop — the DB, not the WS stream, is the source of truth for
// "which orders need a courier". Catches dispatches emitted while the bot
// was down, and rebuilds in-flight state after a restart. See
// orderService.getCourierQueue on the backend.
const BACKFILL_INTERVAL_MS = 60_000;

async function backfillTick(): Promise<void> {
  const queue = await backendClient.fetchCourierQueue();
  for (const entry of queue) {
    if (courierState.has(entry.orderId)) continue;

    if (entry.status === "READY_FOR_DELIVERY" && entry.courierNotifiedAt === null) {
      // Missed dispatch — send the full card as if the WS event had arrived.
      await dispatchOrder(entry.orderId, entry.data);
      console.log(`[backfill] delivered missed dispatch for order ${entry.orderId}`);
    } else {
      // Known to the courier already (or mid-delivery when we restarted) —
      // rebuild state and re-issue a card so the flow can be finished.
      const message = await bot.api.sendMessage(
        env.courierChatId,
        formatOrderCard(entry.orderId, entry.data),
        {
          parse_mode: "HTML",
          reply_markup:
            entry.status === "ON_THE_WAY"
              ? new InlineKeyboard().text("✅ Yetkazdim", `delivered:${entry.orderId}`)
              : orderKeyboard(entry.orderId, entry.data.latitude, entry.data.longitude),
        },
      );
      courierState.recordAssignment(entry.orderId, entry.data, message.message_id);
      console.log(`[backfill] rebuilt state for in-flight order ${entry.orderId} (${entry.status})`);
    }
  }
}

backfillTick().catch((err) => console.error("[backfill] startup tick failed:", err));
setInterval(() => {
  backfillTick().catch((err) => console.error("[backfill] tick failed:", err));
}, BACKFILL_INTERVAL_MS);

bot.catch((err) => console.error("Bot error:", err));

// Long polling for local dev (default), webhook mode for production — see
// docs/decisions.md #5 and BOT_MODE in config/env.ts.
if (env.botMode === "webhook") {
  if (!env.publicWebhookUrl) throw new Error("PUBLIC_WEBHOOK_URL is required when BOT_MODE=webhook");

  const handleUpdate = webhookCallback(bot, "std/http");
  Bun.serve({
    port: env.webhookPort,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === env.webhookPath && req.method === "POST") {
        return handleUpdate(req);
      }
      return new Response("Not found", { status: 404 });
    },
  });

  await bot.api.setWebhook(env.publicWebhookUrl);
  console.log(`Courier bot webhook listening on :${env.webhookPort}${env.webhookPath}`);
} else {
  await bot.api.deleteWebhook().catch(() => {}); // in case it was previously in webhook mode
  bot.start();
  console.log("Courier bot started (long polling)");
}
