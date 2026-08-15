import type { Bot } from "grammy";
import { backendClient } from "../backend/client";
import { liveLocationState } from "../state/liveLocation";

// A bot cannot ask for a *live* location: `request_location` keyboard buttons
// only ever return a one-shot pin. The courier has to start the share from
// Telegram's attach menu, so the best we can do is tell them how, clearly and
// not too often.
export const LIVE_LOCATION_PROMPT =
  "📍 Jonli joylashuvni ulashing — mijoz sizni xaritada kuzatib boradi:\n" +
  "📎 → <b>Joylashuv</b> → <b>Jonli joylashuvni ulashish</b> → 8 soat";

async function report(latitude: number, longitude: number, isLive: boolean): Promise<void> {
  await backendClient
    .reportLocation({ latitude, longitude, isLive })
    .catch((err) => console.error("Failed to report courier location:", err));
}

export function registerLocationHandlers(bot: Bot): void {
  // The initial share. `live_period` is set only for a live share; a plain
  // dropped pin has none.
  bot.on("message:location", async (ctx) => {
    const { latitude, longitude, live_period: livePeriod } = ctx.message.location;

    if (livePeriod) {
      liveLocationState.start(livePeriod);
      await report(latitude, longitude, true);
      await ctx.reply("✅ Jonli joylashuv yoqildi — mijozlar sizni xaritada ko'radi.");
      return;
    }

    // One-shot pin: still worth relaying (it puts the courier on the map), but
    // it ages instantly, so the backend won't derive an ETA from it.
    await report(latitude, longitude, false);
    await ctx.reply(LIVE_LOCATION_PROMPT, { parse_mode: "HTML" });
  });

  // Every subsequent position while the live share runs. This is the
  // high-frequency path, hence the throttle.
  bot.on("edit:location", async (ctx) => {
    const location = ctx.editedMessage?.location;
    if (!location) return;
    if (!liveLocationState.shouldReport()) return;
    await report(location.latitude, location.longitude, true);
  });
}
