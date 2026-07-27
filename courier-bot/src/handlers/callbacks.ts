import type { Bot, Context } from "grammy";
import { backendClient } from "../backend/client";
import { courierState, type PendingDelivery } from "../state/pendingDeliveries";
import { env } from "../config/env";

async function submitDelivery(ctx: Context, orderId: number, pending: PendingDelivery, cashCode: string | null) {
  try {
    await backendClient.confirmDelivery(orderId, pending.photoBlob!, cashCode);
    await ctx.reply(`✅ Yetkazma tasdiqlandi — #${orderId}-buyurtma`);
    courierState.clear(orderId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isCashCodeRejection = message.includes("400");
    if (isCashCodeRejection && cashCode) {
      pending.awaitingCashCode = true;
      await ctx.reply(`⚠️ Kod mos kelmadi — mijozdan qayta so'rab, yana yuboring.`);
    } else {
      pending.awaitingPhoto = !pending.photoBlob;
      await ctx.reply(`⚠️ #${orderId}-buyurtma yetkazmasini tasdiqlab bo'lmadi: ${message}`);
    }
  }
}

export function registerCallbackHandlers(bot: Bot) {
  bot.callbackQuery(/^on_my_way:(\d+)$/, async (ctx) => {
    const orderId = Number(ctx.match![1]);
    await backendClient.updateOrderStatus(orderId, "ON_THE_WAY", "COURIER");
    await ctx.answerCallbackQuery({ text: `#${orderId}-buyurtma yo'lda deb belgilandi` });
    await ctx.editMessageReplyMarkup();
    await ctx.reply(`🚴 Yo'lda — #${orderId}-buyurtma`);
  });

  bot.callbackQuery(/^delivered:(\d+)$/, async (ctx) => {
    const orderId = Number(ctx.match![1]);
    const pending = courierState.startDeliveryConfirmation(orderId);
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup();

    if (!pending) {
      await ctx.reply(`#${orderId}-buyurtma ma'lumotlari topilmadi — administratorga murojaat qiling.`);
      return;
    }
    await ctx.reply(`📸 #${orderId}-buyurtma yetkazilganini tasdiqlash uchun foto yuboring.`);
  });

  // Delivery-proof photo — only acted on while an order is actually
  // awaiting one, so this never interferes with normal chat. With several
  // deliveries awaiting input, the courier must reply to the right order
  // card — otherwise the photo could land on the wrong order.
  bot.on("message:photo", async (ctx) => {
    const found = courierState.resolveForMessage(ctx.message.reply_to_message?.message_id);
    if (!found) return;
    if (found === "ambiguous") {
      await ctx.reply("Bir nechta buyurtma kutilmoqda — fotoni tegishli buyurtma kartasiga javob (reply) qilib yuboring.");
      return;
    }
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
      await ctx.reply(`💵 Endi mijoz aytgan 4 xonali tasdiqlash kodini kiriting.`);
    } else {
      await submitDelivery(ctx, orderId, pending, null);
    }
  });

  // Cash confirmation code — only acted on once a photo has already been
  // captured for a CASH order still awaiting a code.
  bot.on("message:text", async (ctx) => {
    const found = courierState.resolveForMessage(ctx.message.reply_to_message?.message_id);
    if (!found) return;
    if (found === "ambiguous") {
      await ctx.reply("Bir nechta buyurtma kutilmoqda — kodni tegishli buyurtma kartasiga javob (reply) qilib yuboring.");
      return;
    }
    const [orderId, pending] = found;
    if (pending.awaitingPhoto || !pending.awaitingCashCode) return;

    const code = ctx.message.text.trim();
    pending.awaitingCashCode = false;
    await submitDelivery(ctx, orderId, pending, code);
  });
}
