import type { Order, OrderStatus } from "@mydoners/shared-contracts";
import { sendTelegramMessage } from "../core/telegram";
import { env } from "../config/env";

function formatSom(amount: number): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped} so'm`;
}

// Pushed to the customer via @mydoner_bot on order creation and every status
// change — the Mini App's own tracking screen can't be relied on to still be
// open (Telegram doesn't guarantee the WebView survives being backgrounded),
// so the bot chat is the durable channel for "what's happening with my order."
const trackOrderButton = {
  inline_keyboard: [[{ text: "Buyurtmani kuzatish", web_app: { url: env.miniAppUrl } }]],
};

const STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  // Kitchen tapped Accept after checking stock — this is the real "your
  // order is happening" moment now that every order starts PENDING.
  CONFIRMED: "✅ #{id}-buyurtmangiz tasdiqlandi — tayyorlanish boshlanmoqda!",
  COOKING: "🍳 #{id}-buyurtmangiz oshxonada tayyorlanmoqda.",
  READY_FOR_DELIVERY: "📦 #{id}-buyurtmangiz tayyor — kuryer kutilmoqda.",
  ON_THE_WAY: "🚴 #{id}-buyurtmangiz yo'lda!",
  DELIVERED: "✅ #{id}-buyurtmangiz yetkazib berildi. Yoqimli ishtaha!",
  CANCELLED: "❌ #{id}-buyurtmangiz bekor qilindi.",
};

export const orderNotificationService = {
  async notifyOrderReceived(telegramId: number, order: Order): Promise<void> {
    const text =
      `🌯 <b>#${order.id}-buyurtmangiz qabul qilindi!</b>\n` +
      `Jami: ${formatSom(order.totalAmount)}\n\n` +
      `Restoran hozir ko'rib chiqmoqda — tasdiqlanishi bilan sizga xabar beramiz.`;
    await sendTelegramMessage(telegramId, text, { parseMode: "HTML", replyMarkup: trackOrderButton });
  },

  async notifyStatusChange(telegramId: number, order: Order, status: OrderStatus): Promise<void> {
    const template = STATUS_MESSAGES[status];
    if (!template) return; // PENDING is covered by the "received" message above
    const text = template.replace("{id}", String(order.id));
    await sendTelegramMessage(telegramId, text, { replyMarkup: trackOrderButton });
  },
};
