import { createClient } from "redis";
import { env } from "../config/env";

export const redis = createClient({ url: env.redisUrl });
redis.on("error", (err) => console.error("[redis] client error:", err));

let connected = false;
export async function ensureRedisConnected() {
  if (!connected) {
    await redis.connect();
    connected = true;
  }
}
