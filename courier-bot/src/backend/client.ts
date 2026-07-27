import { env } from "../config/env";
import type { ChangedBy, Order, OrderStatus } from "@mydoners/shared-contracts";

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${env.backendUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.courierBotApiKey}`,
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Backend request failed: ${res.status} ${path} — ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface CourierQueueEntry {
  orderId: number;
  status: OrderStatus;
  courierNotifiedAt: string | null;
  data: import("@mydoners/shared-contracts").CourierAssignedData;
}

export const backendClient = {
  fetchCourierQueue(): Promise<CourierQueueEntry[]> {
    return request("/orders/courier-queue", { method: "GET" });
  },

  markCourierNotified(orderId: number): Promise<void> {
    return fetch(`${env.backendUrl}/orders/${orderId}/courier-notified`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.courierBotApiKey}` },
    }).then((res) => {
      if (!res.ok) throw new Error(`Backend request failed: ${res.status} courier-notified`);
    });
  },

  updateOrderStatus(orderId: number, status: OrderStatus, changedBy: ChangedBy): Promise<Order> {
    return request(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, changedBy }),
    });
  },

  async confirmDelivery(orderId: number, photo: Blob, cashConfirmationCode: string | null): Promise<Order> {
    const form = new FormData();
    form.append("photo", photo, "delivery-proof.jpg");
    if (cashConfirmationCode) form.append("cashConfirmationCode", cashConfirmationCode);

    // Don't set Content-Type manually — fetch computes the multipart boundary
    // itself when given a FormData body.
    const res = await fetch(`${env.backendUrl}/orders/${orderId}/delivery-proof`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.courierBotApiKey}` },
      body: form,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Backend request failed: ${res.status} /orders/${orderId}/delivery-proof — ${body}`);
    }
    return res.json() as Promise<Order>;
  },
};
