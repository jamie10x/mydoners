import type { Bot, Context } from "grammy";
import { backendClient } from "../backend/client";
import { courierState, type PendingDelivery } from "../state/pendingDeliveries";
import { env } from "../config/env";

async function submitDelivery(ctx: Context, orderId: number, pending: PendingDelivery, cashCode: string | null) {
  try {
    await backendClient.confirmDelivery(orderId, pending.photoBlob!, cashCode);
    await ctx.reply(`✅ Delivery confirmed — Order #${orderId}`);
    courierState.clear(orderId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isCashCodeRejection = message.includes("400");
    if (isCashCodeRejection && cashCode) {
      pending.awaitingCashCode = true;
      await ctx.reply(`⚠️ That code didn't match — ask the customer to read it again and resend.`);
    } else {
      pending.awaitingPhoto = !pending.photoBlob;
      await ctx.reply(`⚠️ Couldn't confirm delivery for #${orderId}: ${message}`);
    }
  }
}

export function registerCallbackHandlers(bot: Bot) {
  bot.callbackQuery(/^on_my_way:(\d+)$/, async (ctx) => {
    const orderId = Number(ctx.match![1]);
    await backendClient.updateOrderStatus(orderId, "ON_THE_WAY", "COURIER");
    await ctx.answerCallbackQuery({ text: `Order #${orderId} marked as on the way` });
    await ctx.editMessageReplyMarkup();
    await ctx.reply(`🚴 On the way — Order #${orderId}`);
  });

  bot.callbackQuery(/^delivered:(\d+)$/, async (ctx) => {
    const orderId = Number(ctx.match![1]);
    const pending = courierState.startDeliveryConfirmation(orderId);
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup();

    if (!pending) {
      await ctx.reply(`Order #${orderId} — couldn't find its details anymore, contact support.`);
      return;
    }
    await ctx.reply(`📸 Send a photo as delivery proof for Order #${orderId}.`);
  });

  // Delivery-proof photo — only acted on while an order is actually
  // awaiting one, so this never interferes with normal chat.
  bot.on("message:photo", async (ctx) => {
    const found = courierState.findPendingForMessage();
    if (!found) return;
    const [orderId, pending] = found;
    if (!pending.awaitingPhoto) return;

    const photos = ctx.message.photo;
    const largest = photos[photos.length - 1]!;
    const file = await ctx.api.getFile(largest.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${env.botToken}/${file.file_path}`;
    const response = await fetch(fileUrl);
    pending.photoBlob = await response.blob();
    pending.awaitingPhoto = false;

    if (pending.awaitingCashCode) {
      await ctx.reply(`💵 Now enter the 2-digit cash confirmation code the customer gives you.`);
    } else {
      await submitDelivery(ctx, orderId, pending, null);
    }
  });

  // Cash confirmation code — only acted on once a photo has already been
  // captured for a CASH order still awaiting a code.
  bot.on("message:text", async (ctx) => {
    const found = courierState.findPendingForMessage();
    if (!found) return;
    const [orderId, pending] = found;
    if (pending.awaitingPhoto || !pending.awaitingCashCode) return;

    const code = ctx.message.text.trim();
    pending.awaitingCashCode = false;
    await submitDelivery(ctx, orderId, pending, code);
  });
}
