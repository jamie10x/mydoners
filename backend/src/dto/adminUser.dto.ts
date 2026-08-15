import { z } from "zod";

export const userListQuerySchema = z.object({
  q: z.string().trim().min(1).max(64).optional(),
  segment: z
    .enum(["all", "incomplete_profile", "never_ordered", "lapsed", "repeat", "high_cancel", "blacklisted"])
    .default("all"),
  // How stale an order must be for a customer to count as lapsed. Exposed so
  // the owner can widen it for a slow month rather than being stuck at 30.
  lapsedDays: z.coerce.number().int().min(1).max(365).default(30),
  sort: z
    .enum(["createdAt", "lastOrderAt", "completedOrdersCount", "cancelledOrdersCount", "name"])
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export const userUpdateSchema = z.object({
  isBlacklisted: z.boolean(),
});
