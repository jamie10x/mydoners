import { Bot, webhookCallback } from "grammy";
import { env } from "./config/env";
import { registerCallbackHandlers } from "./handlers/callbacks";
import { connectToBackend } from "./ws/socketClient";
import { formatOrderCard, orderKeyboard } from "./orderCard";
import { courierState } from "./state/pendingDeliveries";

const bot = new Bot(env.botToken);

registerCallbackHandlers(bot);

connectToBackend((payload) => {
  const { orderId, data } = payload;
  courierState.recordAssignment(orderId, data);
  bot.api
    .sendMessage(env.courierChatId, formatOrderCard(orderId, data), {
      parse_mode: "HTML",
      reply_markup: orderKeyboard(orderId, data.latitude, data.longitude),
    })
    .catch((err) => console.error(`Failed to send dispatch message for order ${orderId}:`, err));

  // Native Telegram location bubble alongside the text card — tapping it
  // opens the courier's own default maps app directly, on top of the
  // explicit Yandex/Google Maps buttons already in orderKeyboard().
  bot.api
    .sendLocation(env.courierChatId, data.latitude, data.longitude)
    .catch((err) => console.error(`Failed to send location pin for order ${orderId}:`, err));
});

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
