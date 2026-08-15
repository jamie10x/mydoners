import type { Order, OrderStatus } from "@mydoners/shared-contracts";
import { editTelegramMessage, sendTelegramMessage } from "../core/telegram";
import { orderRepository } from "../repositories/orderRepository";
import { env } from "../config/env";

function formatSom(amount: number): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped} so'm`;
}

// Per-order rather than a shared constant: the Mini App reads ?order= on
// launch (see mini-app/src/lib/deepLink.ts) so the button lands on the order
// the message is about, instead of dropping the customer on the menu.
function trackOrderButton(orderId: number) {
  const separator = env.miniAppUrl.includes("?") ? "&" : "?";
  return {
    inline_keyboard: [
      [{ text: "Buyurtmani kuzatish", web_app: { url: `${env.miniAppUrl}${separator}order=${orderId}` } }],
    ],
  };
}

// The one line that changes as the order progresses. PENDING is the initial
// state, so it has an entry here too — unlike before, when it was covered by a
// separate "received" message.
const STATUS_LINES: Record<OrderStatus, string> = {
  PENDING: "⏳ Restoran ko'rib chiqmoqda — tasdiqlanishi bilan xabar beramiz.",
  CONFIRMED: "✅ Tasdiqlandi — tayyorlanish boshlanmoqda!",
  COOKING: "🍳 Oshxonada tayyorlanmoqda.",
  READY_FOR_DELIVERY: "📦 Tayyor — kuryer kutilmoqda.",
  ON_THE_WAY: "🚴 Yo'lda! Kuryerni ilovada kuzatib boring.",
  DELIVERED: "✅ Yetkazib berildi. Yoqimli ishtaha!",
  CANCELLED: "❌ Buyurtma bekor qilindi.",
};

function composeMessage(order: Order, status: OrderStatus): string {
  return (
    `🌯 <b>#${order.id}-buyurtma</b> · ${formatSom(order.totalAmount)}\n\n` + STATUS_LINES[status]
  );
}

/**
 * Keeps exactly one Telegram message per order, rewritten on each status
 * change.
 *
 * Previously every transition sent a fresh message, so a normal order left six
 * near-identical notifications in the customer's chat. Editing in place keeps
 * the chat clean and means the newest state is always the one they're looking
 * at. If the message is gone (deleted, or too old for Telegram to edit) we
 * fall back to sending a new one and remember that id instead.
 */
async function upsertStatusMessage(telegramId: number, order: Order, status: OrderStatus): Promise<void> {
  const text = composeMessage(order, status);
  const markup = trackOrderButton(order.id);
  const existingId = await orderRepository.getStatusMessageId(order.id);

  if (existingId !== null) {
    const outcome = await editTelegramMessage(telegramId, existingId, text, {
      parseMode: "HTML",
      replyMarkup: markup,
    });
    // "not_modified" means the customer is already seeing this exact text.
    if (outcome === "ok" || outcome === "not_modified") return;
    if (outcome === "failed") return; // transient — don't spawn a duplicate message
  }

  const messageId = await sendTelegramMessage(telegramId, text, {
    parseMode: "HTML",
    replyMarkup: markup,
  });
  if (messageId !== null) {
    await orderRepository
      .setStatusMessageId(order.id, messageId)
      .catch((err) => console.error(`Failed to store status message id for order ${order.id}:`, err));
  }
}

export const orderNotificationService = {
  async notifyOrderReceived(telegramId: number, order: Order): Promise<void> {
    await upsertStatusMessage(telegramId, order, order.status);
  },

  async notifyStatusChange(telegramId: number, order: Order, status: OrderStatus): Promise<void> {
    await upsertStatusMessage(telegramId, order, status);
  },
};
