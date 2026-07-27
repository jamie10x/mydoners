import type { OrderStatus } from "@mydoners/shared-contracts";
import type { Actor } from "../middleware/auth";

// Shared by orderService (business rules) and orderRepository (re-validated
// under the row lock — see updateStatus there) so the two can't drift.
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COOKING", "CANCELLED"],
  COOKING: ["READY_FOR_DELIVERY", "CANCELLED"],
  READY_FOR_DELIVERY: ["ON_THE_WAY", "CANCELLED"],
  ON_THE_WAY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

/**
 * Which transitions each caller is allowed to make, layered on top of
 * ALLOWED_TRANSITIONS. Before this, any authenticated token could move any
 * order to any (state-machine-valid) status — e.g. a customer JWT could
 * cancel someone else's order, or the courier key could accept kitchen
 * orders.
 *
 * - customer: cancel their OWN order, only before cooking starts
 * - KDS device: everything the kitchen does, incl. cancels up to dispatch
 * - courier bot: pick-up and delivery steps only
 * - customer bot: no order transitions at all
 */
export function actorMayTransition(
  actor: Actor,
  from: OrderStatus,
  to: OrderStatus,
  orderUserId: number | null,
): boolean {
  switch (actor.type) {
    case "user":
      return to === "CANCELLED" && (from === "PENDING" || from === "CONFIRMED") && actor.telegramId === orderUserId;
    case "device":
      return (
        (from === "CONFIRMED" && to === "COOKING") ||
        (from === "COOKING" && to === "READY_FOR_DELIVERY") ||
        (to === "CANCELLED" && from !== "ON_THE_WAY" && from !== "DELIVERED")
      );
    case "bot":
      if (actor.bot !== "courier") return false;
      return (from === "READY_FOR_DELIVERY" && to === "ON_THE_WAY") || (from === "ON_THE_WAY" && to === "DELIVERED");
  }
}

/** The audit-log actor label is derived from the token, never trusted from the request body. */
export function changedByFor(actor: Actor): "USER" | "KITCHEN" | "COURIER" {
  switch (actor.type) {
    case "user":
      return "USER";
    case "device":
      return "KITCHEN";
    case "bot":
      return "COURIER";
  }
}
