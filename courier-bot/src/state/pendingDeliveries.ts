import type { CourierAssignedData } from "@mydoners/shared-contracts";

interface PendingDelivery {
  orderData: CourierAssignedData;
  awaitingPhoto: boolean;
  awaitingCashCode: boolean;
  photoBlob?: Blob;
}

// Single dedicated courier, at most a handful of in-flight deliveries at
// once — in-memory state is fine because the backend DB is the source of
// truth: after a bot restart, the backfill loop (see index.ts) re-fetches
// GET /orders/courier-queue and rebuilds everything here, so nothing is
// permanently lost with the process.
const activeOrders = new Map<number, CourierAssignedData>();
const pendingDeliveries = new Map<number, PendingDelivery>();
// Telegram message id of each order's dispatch card — lets the courier
// disambiguate by replying to the right card when several deliveries are
// awaiting a photo/code at once.
const cardMessageIds = new Map<number, number>();

export const courierState = {
  recordAssignment(orderId: number, data: CourierAssignedData, cardMessageId?: number) {
    activeOrders.set(orderId, data);
    if (cardMessageId !== undefined) cardMessageIds.set(orderId, cardMessageId);
  },

  has(orderId: number): boolean {
    return activeOrders.has(orderId);
  },

  startDeliveryConfirmation(orderId: number): PendingDelivery | null {
    const orderData = activeOrders.get(orderId);
    if (!orderData) return null;

    const needsCashCode = orderData.paymentType === "CASH" && orderData.paymentStatus === "UNPAID";
    const pending: PendingDelivery = { orderData, awaitingPhoto: true, awaitingCashCode: needsCashCode };
    pendingDeliveries.set(orderId, pending);
    return pending;
  },

  /**
   * Resolves which delivery an incoming photo/text belongs to:
   * - a reply to a specific dispatch card wins outright;
   * - otherwise, if exactly one delivery is awaiting input, it's that one;
   * - with several in flight and no reply, returns "ambiguous" so the
   *   handler can ask the courier to reply to the right card (previously
   *   the first map entry won, which could pin a photo on the wrong order).
   */
  resolveForMessage(replyToMessageId: number | undefined): [number, PendingDelivery] | "ambiguous" | null {
    if (replyToMessageId !== undefined) {
      for (const [orderId, messageId] of cardMessageIds) {
        if (messageId === replyToMessageId) {
          const pending = pendingDeliveries.get(orderId);
          if (pending && (pending.awaitingPhoto || pending.awaitingCashCode)) return [orderId, pending];
        }
      }
    }

    const waiting = [...pendingDeliveries.entries()].filter(
      ([, p]) => p.awaitingPhoto || p.awaitingCashCode,
    );
    if (waiting.length === 1) return waiting[0]!;
    if (waiting.length > 1) return "ambiguous";
    return null;
  },

  clear(orderId: number) {
    pendingDeliveries.delete(orderId);
    activeOrders.delete(orderId);
    cardMessageIds.delete(orderId);
  },
};

export type { PendingDelivery };
