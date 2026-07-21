import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { deviceKeys } from "../db/schema";
import { env } from "../config/env";
import type { RealtimeEvent } from "@mydoners/shared-contracts";

// Implements the connection/auth/room contract documented in docs/websocket-events.md.
// Single namespace, three room kinds: user:<telegramId>, "kitchen", "courier".

let io: SocketIOServer | null = null;

async function resolveRoom(token: string): Promise<string | null> {
  if (env.courierBotApiKey && token === env.courierBotApiKey) return "courier";

  try {
    const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
    return `user:${Number(payload.sub)}`;
  } catch {
    // not a JWT — fall through
  }

  const [device] = await db
    .select()
    .from(deviceKeys)
    .where(and(eq(deviceKeys.apiKey, token), isNull(deviceKeys.revokedAt)));

  return device ? "kitchen" : null;
}

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: "/realtime",
    cors: { origin: "*" }, // Mini App is served from a different origin than the API
  });

  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error("Missing auth token"));
      return;
    }
    const room = await resolveRoom(token);
    if (!room) {
      next(new Error("Invalid auth token"));
      return;
    }
    socket.data.room = room;
    next();
  });

  io.on("connection", (socket: Socket) => {
    const room = socket.data.room as string;
    socket.join(room);
    console.log(`[ws] client connected → room "${room}"`);

    socket.on("disconnect", () => {
      console.log(`[ws] client disconnected ← room "${room}"`);
    });
  });

  return io;
}

function emit<T>(rooms: string[], event: string, orderId: number, data: T) {
  if (!io) {
    console.warn(`[ws] emit("${event}") called before initSocket — dropped`);
    return;
  }
  const payload: RealtimeEvent<T> = { event, orderId, timestamp: new Date().toISOString(), data };
  for (const room of rooms) io.to(room).emit(event, payload);
}

export const realtime = {
  orderCreated<T>(orderId: number, data: T) {
    emit(["kitchen"], "order.created", orderId, data);
  },
  orderStatusChanged<T>(orderId: number, userTelegramId: number, data: T) {
    emit(["kitchen", "courier", `user:${userTelegramId}`], "order.status_changed", orderId, data);
  },
  courierAssigned<T>(orderId: number, data: T) {
    emit(["courier"], "courier.assigned", orderId, data);
  },
  orderCancelled<T>(orderId: number, userTelegramId: number, data: T) {
    emit(["kitchen", "courier", `user:${userTelegramId}`], "order.cancelled", orderId, data);
  },
  deliveryConfirmed<T>(orderId: number, userTelegramId: number, data: T) {
    emit([`user:${userTelegramId}`], "delivery.confirmed", orderId, data);
  },
};
