import type { NextFunction, Request, Response } from "express";
import { redis } from "../core/redis";

interface RateLimitOptions {
  /** Prefix for the Redis key, e.g. "admin-login". */
  name: string;
  max: number;
  windowSeconds: number;
  message: string;
}

/**
 * Fixed-window rate limiter keyed on client IP.
 *
 * Redis-backed rather than in-process on purpose: CI redeploys the backend on
 * every push to main, and an in-memory counter would reset with it — handing a
 * brute-forcer a clean slate on each deploy. Redis is a separate container, so
 * the window survives.
 *
 * Fails open. If Redis is unreachable the request is allowed through: locking
 * the owner out of their own admin panel during a Redis blip is worse than the
 * brief loss of throttling, and the password check itself still stands.
 */
function rateLimitKey(name: string, req: Request): string {
  return `ratelimit:${name}:${req.ip ?? "unknown"}`;
}

/**
 * Clears the caller's window — call after a *successful* attempt so honest use
 * never accumulates toward a lockout. Brute force never reaches this path.
 */
export async function resetRateLimit(name: string, req: Request): Promise<void> {
  try {
    await redis.del(rateLimitKey(name, req));
  } catch (err) {
    console.error(`[rateLimit] ${name} reset failed:`, err);
  }
}

export function rateLimit({ name, max, windowSeconds, message }: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = rateLimitKey(name, req);

    try {
      const hits = await redis.incr(key);
      // Only set the TTL on the first hit of a window, so a burst of requests
      // can't keep pushing the expiry out and extend its own lockout.
      if (hits === 1) await redis.expire(key, windowSeconds);

      if (hits > max) {
        const ttl = await redis.ttl(key);
        res.setHeader("Retry-After", String(ttl > 0 ? ttl : windowSeconds));
        res.status(429).json({ code: "RATE_LIMITED", message });
        return;
      }
    } catch (err) {
      console.error(`[rateLimit] ${name} check failed, allowing request:`, err);
    }

    next();
  };
}
