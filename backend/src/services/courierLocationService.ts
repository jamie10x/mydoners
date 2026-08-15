import type { CourierLocationData } from "@mydoners/shared-contracts";
import { redis } from "../core/redis";
import {
  editTelegramLiveLocation,
  sendTelegramLocation,
  stopTelegramLiveLocation,
} from "../core/telegram";
import { orderRepository } from "../repositories/orderRepository";
import { realtime } from "../ws/socket";
import { estimateEtaMinutes, haversineMeters } from "../lib/geo";

// One key, not one per order: there is a single courier, so their position is
// a property of the shift rather than of any order. If a second courier is
// ever added this becomes `courier:<id>:location` — a key-shape change, not a
// redesign.
const POSITION_KEY = "courier:location";
// Long enough to survive a redeploy or a brief signal loss, short enough that
// a finished shift stops showing a pin. The Mini App independently treats
// anything older than 90s as stale.
const POSITION_TTL_SECONDS = 900;

// Telegram allows ~1 message/sec per chat; one edit per 10s per order leaves
// two orders of magnitude of headroom even with a fan-out.
const MIRROR_THROTTLE_SECONDS = 10;

// 1 hour. A delivery is 15–40 minutes, so this covers the worst case — and it
// is the failsafe: if the backend dies before it can stop the pin, Telegram
// expires it on its own rather than leaving a "live" bubble in the customer's
// chat for a full day.
const LIVE_PERIOD_SECONDS = 3600;
// Telegram natively notifies the customer when the courier comes within this
// radius — a free "your food is nearly here" with no code of ours involved.
const PROXIMITY_ALERT_METERS = 300;

export interface CourierPositionInput {
  latitude: number;
  longitude: number;
  isLive: boolean;
}

interface StoredPosition extends CourierPositionInput {
  reportedAt: string;
}

function buildData(
  position: StoredPosition,
  destination: { latitude: number; longitude: number },
  suppressEta: boolean,
): CourierLocationData {
  const distanceMeters = haversineMeters(position, destination);
  return {
    latitude: position.latitude,
    longitude: position.longitude,
    reportedAt: position.reportedAt,
    isLive: position.isLive,
    distanceMeters,
    // A one-shot pin ages instantly, and with several orders in flight the
    // courier may be visiting someone else first — in both cases a confident
    // number would be wrong, so show none.
    etaMinutes: position.isLive && !suppressEta ? estimateEtaMinutes(distanceMeters) : null,
  };
}

export const courierLocationService = {
  async getCurrent(): Promise<StoredPosition | null> {
    const raw = await redis.get(POSITION_KEY);
    return raw ? (JSON.parse(raw) as StoredPosition) : null;
  },

  /**
   * Ingests one courier position and fans it out to every order currently
   * ON_THE_WAY: a realtime push to each customer's Mini App, plus a throttled
   * edit of their Telegram live-location bubble.
   */
  async report(input: CourierPositionInput): Promise<void> {
    const position: StoredPosition = { ...input, reportedAt: new Date().toISOString() };
    await redis.set(POSITION_KEY, JSON.stringify(position), { EX: POSITION_TTL_SECONDS });

    const active = await orderRepository.listByStatus(["ON_THE_WAY"]);
    // With more than one delivery in flight, no per-order ETA is honest.
    const suppressEta = active.length > 1;

    for (const { order } of active) {
      if (!order.userId) continue;
      const data = buildData(position, order, suppressEta);

      realtime.courierLocation(order.id, order.userId, data);

      // Telegram mirroring is best-effort and must never fail the ingest —
      // the realtime push above is the reliable channel.
      this.mirrorToTelegram(order, position).catch((err) =>
        console.error(`[courierLocation] telegram mirror failed for order ${order.id}:`, err),
      );
    }
  },

  /**
   * Keeps the customer's native live-location bubble in step with the courier.
   * Opens one on the first position of a delivery, then edits it in place.
   */
  async mirrorToTelegram(
    order: { id: number; userId: number | null; courierLiveMessageId: number | null },
    position: StoredPosition,
  ): Promise<void> {
    if (!order.userId || !position.isLive) return;

    if (order.courierLiveMessageId === null) {
      const messageId = await sendTelegramLocation(order.userId, position.latitude, position.longitude, {
        livePeriod: LIVE_PERIOD_SECONDS,
        proximityAlertRadius: PROXIMITY_ALERT_METERS,
      });
      if (messageId === null) return;

      // Lost the race against a concurrent tick — stop the duplicate we just
      // created rather than leaving two live pins in the customer's chat.
      const claimed = await orderRepository.claimLiveLocationMessage(order.id, messageId);
      if (!claimed) await stopTelegramLiveLocation(order.userId, messageId);
      return;
    }

    // Per-order throttle. SET NX EX is atomic, so concurrent ticks can't both
    // acquire it; whoever misses simply skips this round.
    const lockKey = `courier:mirror:${order.id}`;
    const acquired = await redis.set(lockKey, "1", { NX: true, EX: MIRROR_THROTTLE_SECONDS });
    if (acquired === null) return;

    const outcome = await editTelegramLiveLocation(
      order.userId,
      order.courierLiveMessageId,
      position.latitude,
      position.longitude,
    );
    // The pin is gone for good (deleted, expired, or bot blocked) — drop the
    // id so the next tick opens a fresh one instead of editing a dead message.
    if (outcome === "expired") await orderRepository.clearLiveLocationMessage(order.id);
  },

  /** Cold start for a customer opening the Mini App mid-delivery. */
  async forOrder(order: {
    latitude: number;
    longitude: number;
    status: string;
  }): Promise<CourierLocationData | null> {
    if (order.status !== "ON_THE_WAY") return null;
    const position = await this.getCurrent();
    if (!position) return null;

    const active = await orderRepository.listByStatus(["ON_THE_WAY"]);
    return buildData(position, order, active.length > 1);
  },

  /** Called when an order reaches a terminal state, so the pin stops moving. */
  async stopForOrder(order: { id: number; userId: number | null; courierLiveMessageId: number | null }): Promise<void> {
    if (!order.userId || order.courierLiveMessageId === null) return;
    await stopTelegramLiveLocation(order.userId, order.courierLiveMessageId);
    await orderRepository.clearLiveLocationMessage(order.id);
  },
};
