import { redis } from "../core/redis";
import { sendTelegramMessage } from "../core/telegram";

// Fallback path for checkout when the Mini App's browser geolocation is
// denied/unavailable: ask via the customer bot's native "share location"
// button instead. Pending shares live in Redis just long enough for the
// Mini App to pick them up — see docs/auth-contract.md's "who calls what"
// table for the customer-bot -> backend -> Mini App round trip.
const LOCATION_TTL_SECONDS = 10 * 60;
const REMINDER_DELAY_MS = 2 * 60 * 1000;

function locationKey(telegramId: number): string {
  return `location:pending:${telegramId}`;
}

async function sendLocationRequestMessage(telegramId: number, isReminder: boolean): Promise<void> {
  const text = isReminder
    ? "Still need your location for delivery — tap the button below to share it."
    : "Tap the button below to share your current location so we can deliver your order.";

  await sendTelegramMessage(telegramId, text, {
    replyMarkup: {
      keyboard: [[{ text: "📍 Share my location", request_location: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

export const locationRequestService = {
  async requestLocation(telegramId: number): Promise<void> {
    await sendLocationRequestMessage(telegramId, false);

    // One reminder if they haven't shared yet — not a persistent job (won't
    // survive a backend restart), which is an acceptable tradeoff for a
    // single 2-minute nudge tied to an in-progress checkout session.
    setTimeout(() => {
      redis
        .get(locationKey(telegramId))
        .then((existing) => {
          if (!existing) return sendLocationRequestMessage(telegramId, true);
        })
        .catch((err) => console.error(`[location] reminder failed for ${telegramId}:`, err));
    }, REMINDER_DELAY_MS);
  },

  async submitLocation(telegramId: number, latitude: number, longitude: number): Promise<void> {
    await redis.set(locationKey(telegramId), JSON.stringify({ latitude, longitude }), { EX: LOCATION_TTL_SECONDS });
  },

  async getLocation(telegramId: number): Promise<{ latitude: number; longitude: number } | null> {
    const raw = await redis.get(locationKey(telegramId));
    return raw ? JSON.parse(raw) : null;
  },
};
