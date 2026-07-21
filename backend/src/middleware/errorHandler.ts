import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      console.error(`[${req.method} ${req.path}]`, err);
    }
    res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
    return;
  }

  console.error(`[${req.method} ${req.path}] Unhandled error:`, err);
  res.status(500).json({ code: "SERVER_ERROR", message: "Something went wrong" });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` });
}

// Express doesn't catch rejected promises from async route handlers on its own.
export function asyncHandler<T extends (...args: any[]) => Promise<unknown>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
