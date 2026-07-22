import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { env } from "./config/env";
import { BUSINESS } from "./business";
import { maybeStartOnboarding, handleOnboardingText, handleOnboardingContact, handleOnboardingLocation } from "./onboarding";

const bot = new Bot(env.botToken);

// Telegram Bot API rejects "tel:" as an inline button URL scheme (only
// http(s)/tg:// are accepted) — a call button would fail every send. The
// phone number is plain text in the message instead; Telegram auto-detects
// and tap-to-calls properly formatted international numbers on its own.
const orderKeyboard = new InlineKeyboard().webApp("🌯 Order now", env.miniAppUrl);

const helpKeyboard = new InlineKeyboard()
  .webApp("🌯 Order now", env.miniAppUrl)
  .row()
  .url("📷 Instagram", BUSINESS.instagramUrl)
  .url("📢 Channel", BUSINESS.channelUrl);

bot.command("start", async (ctx) => {
  const telegramId = ctx.from?.id;
  if (telegramId && (await maybeStartOnboarding(telegramId, (text) => ctx.reply(text)))) {
    return; // conversation started (or already in progress) instead of the normal welcome
  }

  await ctx.reply(
    `🌯 <b>Welcome to MyDoners!</b>\n${BUSINESS.tagline}\n\n` +
      `Order lavash, pizza, KFC, hotdogs and more — delivered straight to you.\n\n` +
      `Tap below to open the menu and order.`,
    { parse_mode: "HTML", reply_markup: orderKeyboard },
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    `<b>How ordering works</b>\n` +
      `1. Open the menu with the button below (or the "Order now" button next to the message box)\n` +
      `2. Add items to your cart and check out\n` +
      `3. Track your order live, right in the chat\n\n` +
      `<b>Need a human?</b>\n` +
      `📞 ${BUSINESS.phone}\n` +
      `📍 ${BUSINESS.address}\n` +
      `🕒 ${BUSINESS.hours}`,
    { parse_mode: "HTML", reply_markup: helpKeyboard },
  );
});

// Onboarding's text-answer steps (first name, last name, or typing "skip")
// — falls through to the generic catch-all below if no conversation is
// actually in progress for this user.
bot.on("message:text", async (ctx, next) => {
  if (ctx.message.text.startsWith("/")) return next();
  const handled = await handleOnboardingText(ctx.from.id, ctx.message.text, {
    reply: (text, replyMarkup) => ctx.reply(text, replyMarkup ? { reply_markup: replyMarkup } as never : undefined),
  });
  if (!handled) return next();
});

// Onboarding's phone step, via Telegram's native contact-share widget.
bot.on("message:contact", async (ctx) => {
  await handleOnboardingContact(ctx.from.id, ctx.message.contact.phone_number, {
    reply: (text, replyMarkup) => ctx.reply(text, replyMarkup ? { reply_markup: replyMarkup } as never : undefined),
  });
});

// Shared by two flows: onboarding's location step, and checkout's
// browser-geolocation fallback (Mini App calls POST
// /users/:telegramId/location-request, which messages the user here with a
// native "share location" button; this forwards what they share back to the
// backend so the Mini App, polling GET .../location, can pick it up).
bot.on("message:location", async (ctx) => {
  const { latitude, longitude } = ctx.message.location;
  const handledByOnboarding = await handleOnboardingLocation(ctx.from.id, latitude, longitude, {
    reply: (text, replyMarkup) => ctx.reply(text, replyMarkup ? { reply_markup: replyMarkup } as never : undefined),
  });
  if (handledByOnboarding) return;

  try {
    const res = await fetch(`${env.backendUrl}/users/${ctx.from.id}/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.customerBotApiKey}` },
      body: JSON.stringify({ latitude, longitude }),
    });
    if (!res.ok) throw new Error(`backend responded ${res.status}`);
    await ctx.reply("📍 Got it, thanks! Head back to checkout to finish your order.", {
      reply_markup: { remove_keyboard: true },
    });
  } catch (err) {
    console.error("Failed to forward shared location to backend:", err);
    await ctx.reply("Something went wrong saving your location — please try sharing it again.");
  }
});

// Anything else — nudge toward /help rather than going unanswered.
bot.on("message", async (ctx) => {
  await ctx.reply("Type /help to see how ordering works, or tap the button below to order.", {
    reply_markup: orderKeyboard,
  });
});

bot.catch((err) => console.error("Customer bot error:", err));

async function main() {
  await bot.api.setMyCommands([
    { command: "start", description: "Welcome & open the menu" },
    { command: "help", description: "How ordering works, contact & hours" },
  ]);

  // Long polling for local dev (default), webhook mode for production — see
  // courier-bot/src/index.ts for the same pattern.
  if (env.botMode === "webhook") {
    if (!env.publicWebhookUrl) throw new Error("PUBLIC_WEBHOOK_URL is required when BOT_MODE=webhook");

    const handleUpdate = webhookCallback(bot, "std/http");
    Bun.serve({
      port: env.webhookPort,
      async fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === env.webhookPath && req.method === "POST") {
          // Always ack Telegram with 200, even if a reply inside the update
          // handler throws (bot.catch already logs it) — an error response
          // here makes Telegram re-deliver the same update, which re-runs
          // the whole handler and re-sends every message it already sent.
          try {
            return await handleUpdate(req);
          } catch (err) {
            console.error("Unhandled webhook error:", err);
            return new Response("ok", { status: 200 });
          }
        }
        return new Response("Not found", { status: 404 });
      },
    });

    await bot.api.setWebhook(env.publicWebhookUrl);
    console.log(`Customer bot webhook listening on :${env.webhookPort}${env.webhookPath}`);
  } else {
    await bot.api.deleteWebhook().catch(() => {});
    bot.start();
    console.log("Customer bot started (long polling)");
  }
}

main();
