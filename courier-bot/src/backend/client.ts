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

export const backendClient = {
  updateOrderStatus(orderId: number, status: OrderStatus, changedBy: ChangedBy): Promise<Order> {
    return request(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, changedBy }),
    });
  },
};
