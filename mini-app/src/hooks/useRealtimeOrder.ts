import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import type { Order, OrderStatus, OrderStatusChangedData, RealtimeEvent } from "@mydoners/shared-contracts";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

// Poll cadence while the socket is down — REST is the source of truth, the
// socket is just the fast path. 12s keeps a broken-WS session at most ~12s
// stale without hammering the backend.
const POLL_INTERVAL_MS = 12_000;

// Statuses only ever move forward; a stale packet (an out-of-order WS event,
// or a poll response that raced a fresher WS push) must never rewind the
// timeline. CANCELLED ranks above everything so it always applies.
const STATUS_RANK: Record<OrderStatus, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  COOKING: 2,
  READY_FOR_DELIVERY: 3,
  ON_THE_WAY: 4,
  DELIVERED: 5,
  CANCELLED: 6,
};

export function useRealtimeOrder(orderId: number | null, initialStatus: OrderStatus) {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [connected, setConnected] = useState(true);

  const advance = useCallback((next: OrderStatus) => {
    setStatus((prev) => (STATUS_RANK[next] >= STATUS_RANK[prev] ? next : prev));
  }, []);

  // The page's own GET resolves after mount — fold its (fresher) status in.
  // Also fixes resuming an order mid-delivery: without this, the timeline
  // stayed at "received" until the next live event happened to arrive.
  useEffect(() => {
    advance(initialStatus);
  }, [initialStatus, advance]);

  useEffect(() => {
    if (!orderId || !token) return;

    const refetch = () => {
      api
        .get<Order>(`/orders/${orderId}`)
        .then((order) => advance(order.status))
        .catch(() => {}); // polling — the next tick retries anyway
    };

    const socket = io(BASE_URL, { path: "/realtime", auth: { token } });

    // Anything could have happened while the socket was down — reconcile
    // against REST immediately rather than waiting for the next event.
    socket.on("connect", () => {
      setConnected(true);
      refetch();
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));

    socket.on("order.status_changed", (payload: RealtimeEvent<OrderStatusChangedData>) => {
      if (payload.orderId === orderId) advance(payload.data.status);
    });

    socket.on("order.cancelled", (payload: RealtimeEvent<unknown>) => {
      if (payload.orderId === orderId) advance("CANCELLED");
    });

    const pollTimer = setInterval(() => {
      if (!socket.connected) refetch();
    }, POLL_INTERVAL_MS);

    // Telegram backgrounds the WebView freely — catch up the moment the
    // user comes back, whatever state the socket is in.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      socket.disconnect();
      clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [orderId, token, advance]);

  return { status, connected };
}
