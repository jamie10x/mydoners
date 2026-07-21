import type { CourierAssignedData } from "@mydoners/shared-contracts";

interface PendingDelivery {
  orderData: CourierAssignedData;
  awaitingPhoto: boolean;
  awaitingCashCode: boolean;
  photoBlob?: Blob;
}

// Single dedicated courier, at most a handful of in-flight deliveries at
// once — in-memory state is fine here (not persisted across bot restarts;
// acceptable for this scope, see docs/decisions.md).
const activeOrders = new Map<number, CourierAssignedData>();
const pendingDeliveries = new Map<number, PendingDelivery>();

export const courierState = {
  recordAssignment(orderId: number, data: CourierAssignedData) {
    activeOrders.set(orderId, data);
  },

  startDeliveryConfirmation(orderId: number): PendingDelivery | null {
    const orderData = activeOrders.get(orderId);
    if (!orderData) return null;

    const needsCashCode = orderData.paymentType === "CASH" && orderData.paymentStatus === "UNPAID";
    const pending: PendingDelivery = { orderData, awaitingPhoto: true, awaitingCashCode: needsCashCode };
    pendingDeliveries.set(orderId, pending);
    return pending;
  },

  /** At most one delivery is normally awaiting courier input at a time for a single courier. */
  findPendingForMessage(): [number, PendingDelivery] | null {
    for (const entry of pendingDeliveries) {
      const [, pending] = entry;
      if (pending.awaitingPhoto || pending.awaitingCashCode) return entry;
    }
    return null;
  },

  clear(orderId: number) {
    pendingDeliveries.delete(orderId);
    activeOrders.delete(orderId);
  },
};

export type { PendingDelivery };
