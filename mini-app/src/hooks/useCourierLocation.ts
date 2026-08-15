import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import type { CourierLocationData, RealtimeEvent } from "@mydoners/shared-contracts";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

// Unlike useRealtimeOrder's poll (which only runs when the socket is down),
// this one also covers the gap before the first push: the WS only fires on
// movement, so a customer opening the app between two ticks would otherwise
// see an empty map for up to a minute.
const POLL_INTERVAL_MS = 15_000;

// Past this, the pin is shown dimmed with "last seen" rather than as live.
const STALE_AFTER_MS = 90_000;

/**
 * Courier's live position for one order.
 *
 * Same shape of guarantees as useRealtimeOrder — socket as the fast path, REST
 * as the source of truth, reconcile on reconnect and on tab visibility — but
 * ordered by report timestamp instead of status rank, since positions have no
 * inherent progression.
 */
export function useCourierLocation(orderId: number | null, enabled: boolean) {
  const token = useAuthStore((s) => s.token);
  const [position, setPosition] = useState<CourierLocationData | null>(null);
  const [stale, setStale] = useState(false);

  // Never let an out-of-order packet (a poll racing a push) rewind the pin.
  const apply = useCallback((next: CourierLocationData | null) => {
    if (!next) return;
    setPosition((prev) =>
      prev && Date.parse(next.reportedAt) <= Date.parse(prev.reportedAt) ? prev : next,
    );
  }, []);

  useEffect(() => {
    if (!enabled) setPosition(null);
  }, [enabled]);

  useEffect(() => {
    if (!orderId || !token || !enabled) return;

    const refetch = () => {
      api
        .get<CourierLocationData | null>(`/orders/${orderId}/courier-location`)
        .then(apply)
        .catch(() => {}); // polling — the next tick retries
    };

    refetch();

    const socket = io(BASE_URL, { path: "/realtime", auth: { token } });
    socket.on("connect", refetch);
    socket.on("courier.location", (payload: RealtimeEvent<CourierLocationData>) => {
      if (payload.orderId === orderId) apply(payload.data);
    });

    const pollTimer = setInterval(refetch, POLL_INTERVAL_MS);

    // Telegram backgrounds the WebView aggressively; catch up on return.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      socket.disconnect();
      clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [orderId, token, enabled, apply]);

  // Recomputed on a ticker so staleness appears without needing a new event.
  useEffect(() => {
    if (!position) {
      setStale(false);
      return;
    }
    const check = () => setStale(Date.now() - Date.parse(position.reportedAt) > STALE_AFTER_MS);
    check();
    const timer = setInterval(check, 15_000);
    return () => clearInterval(timer);
  }, [position]);

  return { position, stale };
}
