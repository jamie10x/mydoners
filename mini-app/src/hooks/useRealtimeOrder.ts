import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import type { OrderStatus, OrderStatusChangedData, RealtimeEvent } from "@mydoners/shared-contracts";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export function useRealtimeOrder(orderId: number | null, initialStatus: OrderStatus) {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState<OrderStatus>(initialStatus);

  useEffect(() => {
    if (!orderId || !token) return;

    const socket = io(BASE_URL, { path: "/realtime", auth: { token } });

    socket.on("order.status_changed", (payload: RealtimeEvent<OrderStatusChangedData>) => {
      if (payload.orderId === orderId) setStatus(payload.data.status);
    });

    socket.on("order.cancelled", (payload: RealtimeEvent<unknown>) => {
      if (payload.orderId === orderId) setStatus("CANCELLED");
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId, token]);

  return status;
}
