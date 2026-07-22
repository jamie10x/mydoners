import type { Order, OrderStatus } from "@mydoners/shared-contracts";
import { sendTelegramMessage } from "../core/telegram";
import { env } from "../config/env";

function formatSom(amount: number): string {
  return `${amount.toLocaleString("en-US")} UZS`;
}

// Pushed to the customer via @mydoner_bot on order creation and every status
// change — the Mini App's own tracking screen can't be relied on to still be
// open (Telegram doesn't guarantee the WebView survives being backgrounded),
// so the bot chat is the durable channel for "what's happening with my order."
const trackOrderButton = {
  inline_keyboard: [[{ text: "Track order", web_app: { url: env.miniAppUrl } }]],
};

const STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  COOKING: "🍳 Order #{id} is being cooked.",
  READY_FOR_DELIVERY: "📦 Order #{id} is ready and waiting for a courier.",
  ON_THE_WAY: "🚴 Order #{id} is on the way!",
  DELIVERED: "✅ Order #{id} was delivered. Enjoy your meal!",
  CANCELLED: "❌ Order #{id} was cancelled.",
};

export const orderNotificationService = {
  async notifyOrderReceived(telegramId: number, order: Order): Promise<void> {
    const text =
      `🌯 <b>Order #${order.id} received!</b>\n` +
      `Total: ${formatSom(order.totalAmount)}\n\n` +
      `We'll message you here as it moves through the kitchen and out for delivery.`;
    await sendTelegramMessage(telegramId, text, { parseMode: "HTML", replyMarkup: trackOrderButton });
  },

  async notifyStatusChange(telegramId: number, order: Order, status: OrderStatus): Promise<void> {
    const template = STATUS_MESSAGES[status];
    if (!template) return; // PENDING/CONFIRMED are covered by the "received" message
    const text = template.replace("{id}", String(order.id));
    await sendTelegramMessage(telegramId, text, { replyMarkup: trackOrderButton });
  },
};
