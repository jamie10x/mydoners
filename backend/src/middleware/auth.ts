import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "../db";
import { deviceKeys } from "../db/schema";
import { env } from "../config/env";
import { UnauthorizedError } from "../errors/AppError";

export interface TelegramInitDataUser {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
}

// Implements the algorithm documented in docs/auth-contract.md #1 —
// keep this function and that doc in sync.
export function verifyTelegramInitData(initData: string, botToken: string): TelegramInitDataUser {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");
  // Telegram clients also send a "signature" field (Ed25519, for a separate
  // third-party validation path) — it must be excluded from the HMAC
  // data-check-string just like "hash", or verification fails for every
  // real Telegram client. See docs/auth-contract.md #1.
  params.delete("signature");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const valid =
    hash !== null &&
    computedHash.length === hash.length &&
    timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));

  if (!valid) throw new UnauthorizedError("Invalid Telegram initData signature");

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > 86400) {
    throw new UnauthorizedError("initData expired");
  }

  const userRaw = params.get("user");
  if (!userRaw) throw new UnauthorizedError("initData missing user field");

  const parsed = JSON.parse(userRaw);
  return {
    telegramId: parsed.id,
    firstName: parsed.first_name,
    lastName: parsed.last_name,
    username: parsed.username,
  };
}

export function signSessionToken(telegramId: number): string {
  return jwt.sign({ sub: telegramId }, env.jwtSecret, { expiresIn: "24h" });
}

export type Actor =
  | { type: "user"; telegramId: number }
  | { type: "device"; deviceId: number; label: string }
  | { type: "bot" };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor?: Actor;
    }
  }
}

/**
 * Accepts any of the three token types described in docs/auth-contract.md:
 * Mini App JWT, KDS device API key, or the courier bot's shared secret.
 * Tried cheapest-first (bot secret compare, then JWT verify) before the
 * device_keys DB lookup.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new UnauthorizedError("Missing Authorization header"));
    return;
  }
  const token = header.slice("Bearer ".length);

  if (env.courierBotApiKey && token === env.courierBotApiKey) {
    req.actor = { type: "bot" };
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
    req.actor = { type: "user", telegramId: Number(payload.sub) };
    next();
    return;
  } catch {
    // not a valid JWT — fall through to device key check
  }

  const [device] = await db
    .select()
    .from(deviceKeys)
    .where(and(eq(deviceKeys.apiKey, token), isNull(deviceKeys.revokedAt)));

  if (device) {
    req.actor = { type: "device", deviceId: device.id, label: device.label };
    next();
    return;
  }

  next(new UnauthorizedError("Invalid credentials"));
}
