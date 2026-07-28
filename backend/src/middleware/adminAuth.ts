import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthorizedError } from "../errors/AppError";

export function checkAdminPassword(password: string): boolean {
  if (!env.adminPassword) return false; // admin panel disabled if unset — never match on an empty secret
  const a = Buffer.from(password);
  const b = Buffer.from(env.adminPassword);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signAdminToken(): string {
  return jwt.sign({ admin: true }, env.jwtSecret, { expiresIn: "7d" });
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new UnauthorizedError("Authorization header topilmadi"));
    return;
  }
  try {
    const payload = jwt.verify(header.slice("Bearer ".length), env.jwtSecret) as jwt.JwtPayload;
    if (payload.admin !== true) throw new Error("not an admin token");
    next();
  } catch {
    next(new UnauthorizedError("Sessiya tugagan yoki yaroqsiz — qayta kiring"));
  }
}
