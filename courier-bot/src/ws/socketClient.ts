import { io, type Socket } from "socket.io-client";
import { env } from "../config/env";
import type { CourierAssignedData, RealtimeEvent } from "@mydoners/shared-contracts";

// Bot subscribes as a Socket.io client rather than the backend calling a
// bot-specific webhook — see docs/decisions.md #5.
export function connectToBackend(onCourierAssigned: (payload: RealtimeEvent<CourierAssignedData>) => void): Socket {
  const socket = io(env.backendUrl, {
    path: "/realtime",
    auth: { token: env.courierBotApiKey },
    reconnection: true,
  });

  socket.on("connect", () => console.log("[ws] connected to backend"));
  socket.on("connect_error", (err) => console.error("[ws] connect_error:", err.message));
  socket.on("disconnect", (reason) => console.warn("[ws] disconnected:", reason));

  socket.on("courier.assigned", (payload: RealtimeEvent<CourierAssignedData>) => {
    onCourierAssigned(payload);
  });

  return socket;
}
