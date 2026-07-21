import type { Bot } from "grammy";
import { backendClient } from "../backend/client";

export function registerCallbackHandlers(bot: Bot) {
  bot.callbackQuery(/^on_my_way:(\d+)$/, async (ctx) => {
    const orderId = Number(ctx.match![1]);
    await backendClient.updateOrderStatus(orderId, "ON_THE_WAY", "COURIER");
    await ctx.answerCallbackQuery({ text: `Order #${orderId} marked as on the way` });
    await ctx.editMessageReplyMarkup(); // drop the buttons once acted on
    await ctx.reply(`🚴 On the way — Order #${orderId}`);
  });

  bot.callbackQuery(/^delivered:(\d+)$/, async (ctx) => {
    const orderId = Number(ctx.match![1]);
    await backendClient.updateOrderStatus(orderId, "DELIVERED", "COURIER");
    await ctx.answerCallbackQuery({ text: `Order #${orderId} marked as delivered` });
    await ctx.editMessageReplyMarkup();
    await ctx.reply(`✅ Delivered — Order #${orderId}`);
  });
}
