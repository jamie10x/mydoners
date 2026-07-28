import { randomInt } from "node:crypto";
import type { ChangedBy, CourierAssignedData, Order, OrderStatus, SalesSummary } from "@mydoners/shared-contracts";
import { orderRepository, type NewOrderItemInput } from "../repositories/orderRepository";
import { productRepository } from "../repositories/productRepository";
import { userRepository } from "../repositories/userRepository";
import { CodBlockedError, ConflictError, NotFoundError, ValidationError } from "../errors/AppError";
import { realtime } from "../ws/socket";
import type { CreateOrderInput } from "../dto/order.dto";
import type { orders } from "../db/schema";
import { scoreOrderRisk } from "./riskService";
import { ALLOWED_TRANSITIONS, actorMayTransition } from "../domain/orderTransitions";
import type { Actor } from "../middleware/auth";
import { ForbiddenError } from "../errors/AppError";
import { redis } from "../core/redis";
import { paymentService } from "./paymentService";
import { orderNotificationService } from "./orderNotificationService";
import type { RiskAssessment } from "@mydoners/shared-contracts";

type OrderRow = typeof orders.$inferSelect;
interface OrderItemRow {
  id: number;
  productId: number | null;
  productName: string;
  selectedVariant: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

function toApiOrder(order: OrderRow, items: OrderItemRow[]): Order {
  return {
    id: order.id,
    status: order.status as OrderStatus,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId!,
      productName: item.productName,
      selectedVariant: item.selectedVariant,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    })),
    totalAmount: Number(order.totalAmount),
    paymentType: order.paymentType as Order["paymentType"],
    paymentStatus: order.paymentStatus as Order["paymentStatus"],
    latitude: order.latitude,
    longitude: order.longitude,
    landmarkAddress: order.landmarkAddress,
    courierNotes: order.courierNotes,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerTelegramUsername: order.customerTelegramUsername,
    addressLabel: order.addressLabel,
    riskLevel: order.riskLevel as Order["riskLevel"],
    cashConfirmationCode: order.cashConfirmationCode,
    deliveryProofPhotoUrl: order.deliveryProofPhotoUrl,
    createdAt: order.createdAt!.toISOString(),
    updatedAt: order.updatedAt!.toISOString(),
  };
}

function generateCashConfirmationCode(): string {
  // 4 digits: 1-in-10,000 guess space, paired with the attempt limit in
  // confirmDelivery (previously 2 digits = 1-in-100, no limit).
  return String(randomInt(0, 10_000)).padStart(4, "0");
}

// Cash-code guesses per order before delivery confirmation locks out —
// generous for honest typos, useless for brute force against 10k codes.
const MAX_CASH_CODE_ATTEMPTS = 5;
const cashCodeAttemptsKey = (orderId: number) => `cashcode:attempts:${orderId}`;

// "Business happening today" for KDS's ambient today-strip and history —
// counts everything except orders that were rejected/cancelled, including
// ones still in flight (not just DELIVERED), since a kitchen glancing at
// "today" wants a sense of total volume, not just fully-closed revenue.
const NON_CANCELLED_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COOKING",
  "READY_FOR_DELIVERY",
  "ON_THE_WAY",
  "DELIVERED",
];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

type UserRow = Awaited<ReturnType<typeof userRepository.findByTelegramId>>;

// Everything the courier needs on the dispatch card — shared by the WS
// courier.assigned event (fast path) and GET /orders/courier-queue (the
// bot's backfill/recovery path), so the two can never drift apart.
function buildCourierData(order: OrderRow, user: UserRow): CourierAssignedData {
  return {
    customerName: order.customerName ?? ([user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Unknown"),
    customerPhone: order.customerPhone ?? (user?.isPhoneVerified ? user.phoneNumber : null),
    latitude: order.latitude,
    longitude: order.longitude,
    landmarkAddress: order.landmarkAddress,
    paymentType: order.paymentType as CourierAssignedData["paymentType"],
    paymentStatus: order.paymentStatus as CourierAssignedData["paymentStatus"],
    amountToCollect: order.paymentStatus === "PAID" ? 0 : Number(order.totalAmount),
    courierNotes: order.courierNotes,
  };
}

export const orderService = {
  async createOrder(telegramId: number, input: CreateOrderInput): Promise<Order> {
    // Fast path for a retried submission: the first attempt already created
    // the order, return it as-is. The unique constraint below closes the
    // remaining race between two truly concurrent submits.
    if (input.idempotencyKey) {
      const existing = await orderRepository.findByIdempotencyKey(input.idempotencyKey);
      if (existing) return this.getOrder(existing.id);
    }

    const resolvedItems: NewOrderItemInput[] = [];
    let totalAmount = 0;

    for (const line of input.items) {
      const product = await productRepository.findById(line.productId);
      if (!product || !product.isAvailable) {
        throw new ValidationError(`Product ${line.productId} is not available`, { productId: line.productId });
      }

      let unitPrice: number;
      if (product.hasMeatChoice) {
        if (line.selectedVariant !== "Beef" && line.selectedVariant !== "Chicken") {
          throw new ValidationError(`Product "${product.name}" requires selecting Beef or Chicken`, {
            productId: line.productId,
          });
        }
        unitPrice = Number(line.selectedVariant === "Beef" ? product.beefPrice : product.chickenPrice);
      } else {
        if (line.selectedVariant) {
          throw new ValidationError(`Product "${product.name}" does not support variant selection`, {
            productId: line.productId,
          });
        }
        unitPrice = Number(product.basePrice);
      }

      const totalPrice = unitPrice * line.quantity;
      totalAmount += totalPrice;
      resolvedItems.push({
        productId: line.productId,
        selectedVariant: line.selectedVariant ?? null,
        quantity: line.quantity,
        unitPrice,
        totalPrice,
      });
    }

    const user = await userRepository.findByTelegramId(telegramId);
    if (!user) throw new Error(`User ${telegramId} not found — should have been created at login`);

    // Risk scoring only applies to Cash on Delivery — Click/Payme orders are
    // prepaid and carry no CoD risk. See services/riskService.ts and the
    // roadmap's Phase 2 section.
    let riskLevel: Order["riskLevel"] = null;
    if (input.paymentType === "CASH") {
      const assessment = scoreOrderRisk({
        completedOrdersCount: user.completedOrdersCount ?? 0,
        cancelledOrdersCount: user.cancelledOrdersCount ?? 0,
        isBlacklisted: user.isBlacklisted ?? false,
        isPhoneVerified: user.isPhoneVerified ?? false,
        orderTotalAmount: totalAmount,
      });

      if (assessment.action === "COD_BLOCKED") {
        throw new CodBlockedError(
          "Cash on Delivery isn't available for this order — please pay via Click or Payme.",
        );
      }
      riskLevel = assessment.riskLevel;
    }

    // Every order starts PENDING: the kitchen reviews stock and taps Accept
    // (PENDING → CONFIRMED, see domain/orderTransitions.ts) before the
    // customer sees any progress. HIGH-risk CoD orders never reach this —
    // they're blocked above; MEDIUM-risk still lands here same as everyone
    // else, with the risk badge as extra context for the kitchen's review
    // rather than a separate customer-facing verification step.
    let orderId: number;
    try {
      orderId = await orderRepository.create({
        userId: telegramId,
        status: "PENDING",
        totalAmount,
        paymentType: input.paymentType,
        latitude: input.latitude,
        longitude: input.longitude,
        landmarkAddress: input.landmarkAddress,
        courierNotes: input.courierNotes ?? null,
        riskLevel,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerTelegramUsername: user.username ?? null,
        addressLabel: input.addressLabel ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        items: resolvedItems,
      });
    } catch (err) {
      // Unique violation on idempotency_key: a concurrent duplicate of the
      // same submission won the insert — return that order.
      if (input.idempotencyKey && err instanceof Error && err.message.includes("idempotency")) {
        const winner = await orderRepository.findByIdempotencyKey(input.idempotencyKey);
        if (winner) return this.getOrder(winner.id);
      }
      throw err;
    }

    if (input.paymentType === "CLICK" || input.paymentType === "PAYME") {
      // Stub provider — see paymentService.ts. Simulates instant success so
      // the rest of the flow (paymentStatus=PAID, courier's amountToCollect)
      // works end-to-end pending real Click/Payme merchant credentials.
      await paymentService.initiatePayment(orderId, input.paymentType, totalAmount);
      await orderRepository.markPaid(orderId);
    }

    const created = await orderRepository.findById(orderId);
    if (!created) throw new Error("Order vanished immediately after creation");

    realtime.orderCreated(orderId, {
      status: created.order.status,
      customerName: created.order.customerName ?? ([user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"),
      items: created.items.map((item) => ({
        productName: item.productName,
        selectedVariant: item.selectedVariant,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      totalAmount: Number(created.order.totalAmount),
      paymentType: created.order.paymentType,
      paymentStatus: created.order.paymentStatus,
      landmarkAddress: created.order.landmarkAddress,
      courierNotes: created.order.courierNotes,
      riskLevel: created.order.riskLevel,
    });

    if (riskLevel === "MEDIUM" || riskLevel === "HIGH") {
      const assessment = scoreOrderRisk({
        completedOrdersCount: user.completedOrdersCount ?? 0,
        cancelledOrdersCount: user.cancelledOrdersCount ?? 0,
        isBlacklisted: user.isBlacklisted ?? false,
        isPhoneVerified: user.isPhoneVerified ?? false,
        orderTotalAmount: totalAmount,
      });
      realtime.orderRiskFlagged(orderId, telegramId, {
        riskLevel: assessment.riskLevel as "MEDIUM" | "HIGH",
        reason: assessment.reason as "FIRST_ORDER_HIGH_VALUE" | "REPEAT_CANCELLATIONS",
        action: assessment.action as "OTP_REQUIRED" | "VERBAL_CONFIRMATION_REQUIRED" | "COD_BLOCKED",
      });
    }

    const apiOrder = toApiOrder(created.order, created.items);
    orderNotificationService.notifyOrderReceived(telegramId, apiOrder).catch((err) => {
      console.error(`Failed to send order-received notification for order ${orderId}:`, err);
    });

    return apiOrder;
  },

  async getOrder(orderId: number): Promise<Order> {
    const result = await orderRepository.findById(orderId);
    if (!result) throw new NotFoundError(`Order ${orderId} not found`);
    return toApiOrder(result.order, result.items);
  },

  // Backs GET /orders/mine — Profile's order-history list.
  async listMine(telegramId: number, limit: number): Promise<Order[]> {
    const results = await orderRepository.listByUser(telegramId, limit);
    return results.map(({ order, items }) => toApiOrder(order, items));
  },

  // Shared by KDS's today-only "Sales" screen and the admin dashboard's
  // per-period summary (arbitrary date range) — see orderController.todaySummary
  // and adminController.analytics.
  async getSalesSummary(from: Date, to: Date): Promise<SalesSummary> {
    const results = await orderRepository.listByDateRange(from, to, NON_CANCELLED_STATUSES);

    const orderCount = results.length;
    const revenue = results.reduce((sum, { order }) => sum + Number(order.totalAmount), 0);

    const itemTotals = new Map<string, number>();
    for (const { items } of results) {
      for (const item of items) {
        itemTotals.set(item.productName, (itemTotals.get(item.productName) ?? 0) + item.quantity);
      }
    }
    const topItems = [...itemTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productName, quantity]) => ({ productName, quantity }));

    return { orderCount, revenue, topItems };
  },

  async getTodaySummary(): Promise<SalesSummary> {
    return this.getSalesSummary(startOfToday(), new Date());
  },

  // Shared by KDS's today-only History screen (statuses fixed to the two
  // terminal ones — anything still active is already visible in the live
  // queue) and the admin dashboard's filterable history table (any range,
  // any status subset).
  async listOrdersInRange(from: Date, to: Date, statuses: OrderStatus[] | null): Promise<Order[]> {
    const results = await orderRepository.listByDateRange(from, to, statuses);
    return results.map(({ order, items }) => toApiOrder(order, items));
  },

  async getTodayHistory(): Promise<Order[]> {
    return this.listOrdersInRange(startOfToday(), new Date(), ["DELIVERED", "CANCELLED"]);
  },

  // 404, not 403, for someone else's order — a Forbidden response would
  // confirm the guessed id exists.
  async assertOwnedBy(orderId: number, telegramId: number): Promise<void> {
    const result = await orderRepository.findById(orderId);
    if (!result || result.order.userId !== telegramId) {
      throw new NotFoundError(`Order ${orderId} not found`);
    }
  },

  // Backs GET /orders/:orderId/risk. Recomputes from the customer's current
  // stats rather than persisting the original reason/action — riskLevel
  // itself is frozen at order-creation time (see createOrder), but the
  // human-readable reason/action are cheap to recompute and stay accurate if
  // this is queried later. CoD-only, matching createOrder's gating.
  async getRiskAssessment(orderId: number): Promise<RiskAssessment> {
    const result = await orderRepository.findById(orderId);
    if (!result) throw new NotFoundError(`Order ${orderId} not found`);

    if (result.order.paymentType !== "CASH" || !result.order.riskLevel) {
      return { riskLevel: "LOW", reason: "LOW_VALUE_ORDER", action: "NONE" };
    }

    const user = await userRepository.findByTelegramId(result.order.userId!);
    return scoreOrderRisk({
      completedOrdersCount: user?.completedOrdersCount ?? 0,
      cancelledOrdersCount: user?.cancelledOrdersCount ?? 0,
      isBlacklisted: user?.isBlacklisted ?? false,
      isPhoneVerified: user?.isPhoneVerified ?? false,
      orderTotalAmount: Number(result.order.totalAmount),
    });
  },

  // Backs GET /orders?status=... — see docs/openapi.yaml. Used by the KDS
  // app on launch/reconnect to recover its work queue, since WebSocket
  // events emitted while disconnected are otherwise lost.
  async listByStatus(statuses: OrderStatus[]): Promise<Order[]> {
    const results = await orderRepository.listByStatus(statuses);
    return results.map(({ order, items }) => toApiOrder(order, items));
  },

  // Backs GET /orders/courier-queue — the courier bot's recovery loop. An
  // order in READY_FOR_DELIVERY with courierNotifiedAt still NULL is a
  // dispatch that was never delivered (bot down when the WS event fired);
  // ON_THE_WAY entries let a restarted bot rebuild its in-flight state.
  async getCourierQueue(): Promise<
    Array<{ orderId: number; status: OrderStatus; courierNotifiedAt: string | null; data: CourierAssignedData }>
  > {
    const results = await orderRepository.listByStatus(["READY_FOR_DELIVERY", "ON_THE_WAY"]);
    return Promise.all(
      results.map(async ({ order }) => {
        const user = order.userId ? await userRepository.findByTelegramId(order.userId) : null;
        return {
          orderId: order.id,
          status: order.status as OrderStatus,
          courierNotifiedAt: order.courierNotifiedAt?.toISOString() ?? null,
          data: buildCourierData(order, user),
        };
      }),
    );
  },

  async markCourierNotified(orderId: number): Promise<void> {
    await orderRepository.markCourierNotified(orderId);
  },

  async updateStatus(orderId: number, newStatus: OrderStatus, changedBy: ChangedBy, actor?: Actor): Promise<Order> {
    const existing = await orderRepository.findById(orderId);
    if (!existing) throw new NotFoundError(`Order ${orderId} not found`);

    const currentStatus = existing.order.status as OrderStatus;
    if (!ALLOWED_TRANSITIONS[currentStatus].includes(newStatus)) {
      throw new ConflictError(`Cannot transition order from ${currentStatus} to ${newStatus}`, {
        currentStatus,
        requestedStatus: newStatus,
      });
    }

    // Who may perform which transition — see domain/orderTransitions.ts.
    // `actor` is undefined only for trusted internal calls (e.g. payment
    // webhooks), never for HTTP requests.
    if (actor && !actorMayTransition(actor, currentStatus, newStatus, existing.order.userId)) {
      throw new ForbiddenError(`This caller may not transition an order from ${currentStatus} to ${newStatus}`);
    }

    if (
      newStatus === "READY_FOR_DELIVERY" &&
      existing.order.paymentType === "CASH" &&
      existing.order.paymentStatus === "UNPAID"
    ) {
      await orderRepository.setCashConfirmationCode(orderId, generateCashConfirmationCode());
    }

    const result = await orderRepository.updateStatus(orderId, newStatus, changedBy);
    if (!result) throw new NotFoundError(`Order ${orderId} not found`);
    if ("conflict" in result) {
      // Lost a race: another caller moved the order between our unlocked
      // pre-check above and the locked write.
      throw new ConflictError(`Cannot transition order from ${result.conflict} to ${newStatus}`, {
        currentStatus: result.conflict,
        requestedStatus: newStatus,
      });
    }

    const userId = existing.order.userId!;

    realtime.orderStatusChanged(orderId, userId, {
      status: newStatus,
      previousStatus: result.previousStatus,
      changedBy,
    });

    orderNotificationService
      .notifyStatusChange(userId, toApiOrder(existing.order, existing.items), newStatus)
      .catch((err) => console.error(`Failed to send status-change notification for order ${orderId}:`, err));

    if (newStatus === "READY_FOR_DELIVERY") {
      const user = await userRepository.findByTelegramId(userId);
      realtime.courierAssigned(orderId, buildCourierData(existing.order, user));
    }

    if (newStatus === "CANCELLED") {
      realtime.orderCancelled(orderId, userId, { cancelledBy: changedBy, reason: null });
      if (currentStatus === "COOKING" || currentStatus === "READY_FOR_DELIVERY" || currentStatus === "ON_THE_WAY") {
        await userRepository.incrementCancelledOrders(userId);
      }
    }

    if (newStatus === "DELIVERED") {
      await userRepository.incrementCompletedOrders(userId);
      realtime.deliveryConfirmed(orderId, userId, {
        deliveredAt: new Date().toISOString(),
        proofPhotoUrl: existing.order.deliveryProofPhotoUrl,
      });
    }

    return this.getOrder(orderId);
  },

  // Backs POST /orders/:orderId/delivery-proof — the courier's "Delivered"
  // action. For CASH orders, the customer reads back the 2-digit code
  // generated when the order left the kitchen; mismatches are rejected so a
  // courier can't mark cash as collected without the customer's confirmation.
  async confirmDelivery(orderId: number, photoUrl: string, submittedCashCode: string | null): Promise<Order> {
    const attemptsKey = cashCodeAttemptsKey(orderId);
    const attempts = Number((await redis.get(attemptsKey)) ?? 0);
    if (attempts >= MAX_CASH_CODE_ATTEMPTS) {
      throw new ValidationError("Too many cash-code attempts — call the restaurant to confirm this delivery", {
        orderId,
      });
    }

    const result = await orderRepository.confirmDelivery(orderId, photoUrl, submittedCashCode);

    if ("error" in result) {
      if (result.error === "NOT_FOUND") throw new NotFoundError(`Order ${orderId} not found`);
      if (result.error === "BAD_STATUS") {
        throw new ConflictError(`Cannot transition order from ${result.currentStatus} to DELIVERED`, {
          currentStatus: result.currentStatus,
          requestedStatus: "DELIVERED",
        });
      }
      // BAD_CODE — count the failed guess, expire the counter with the order's relevance window.
      await redis.multi().incr(attemptsKey).expire(attemptsKey, 86_400).exec();
      throw new ValidationError("Cash confirmation code does not match", { orderId });
    }

    const userId = result.order.userId!;
    await userRepository.incrementCompletedOrders(userId);
    realtime.orderStatusChanged(orderId, userId, {
      status: "DELIVERED",
      previousStatus: result.previousStatus,
      changedBy: "COURIER",
    });
    realtime.deliveryConfirmed(orderId, userId, {
      deliveredAt: new Date().toISOString(),
      proofPhotoUrl: photoUrl,
    });
    orderNotificationService
      .notifyStatusChange(userId, toApiOrder(result.order, []), "DELIVERED")
      .catch((err) => console.error(`Failed to send delivered notification for order ${orderId}:`, err));

    return this.getOrder(orderId);
  },
};
