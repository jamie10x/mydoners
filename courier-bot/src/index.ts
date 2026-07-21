import { Bot } from "grammy";
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
});

bot.catch((err) => console.error("Bot error:", err));

// Long polling for local dev, per docs/decisions.md — switch to webhook mode
// for production if request latency to Telegram's servers matters.
bot.start();
console.log("Courier bot started (long polling)");
