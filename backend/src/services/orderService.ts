import { randomInt } from "node:crypto";
import type { ChangedBy, Order, OrderStatus } from "@mydoners/shared-contracts";
import { orderRepository, type NewOrderItemInput } from "../repositories/orderRepository";
import { productRepository } from "../repositories/productRepository";
import { userRepository } from "../repositories/userRepository";
import { CodBlockedError, ConflictError, NotFoundError, ValidationError } from "../errors/AppError";
import { realtime } from "../ws/socket";
import type { CreateOrderInput } from "../dto/order.dto";
import type { orders } from "../db/schema";
import { scoreOrderRisk } from "./riskService";
import { paymentService } from "./paymentService";
import type { RiskAssessment } from "@mydoners/shared-contracts";

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COOKING", "CANCELLED"],
  COOKING: ["READY_FOR_DELIVERY", "CANCELLED"],
  READY_FOR_DELIVERY: ["ON_THE_WAY", "CANCELLED"],
  ON_THE_WAY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

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
    riskLevel: order.riskLevel as Order["riskLevel"],
    cashConfirmationCode: order.cashConfirmationCode,
    deliveryProofPhotoUrl: order.deliveryProofPhotoUrl,
    createdAt: order.createdAt!.toISOString(),
    updatedAt: order.updatedAt!.toISOString(),
  };
}

function generateCashConfirmationCode(): string {
  return String(randomInt(0, 100)).padStart(2, "0");
}

export const orderService = {
  async createOrder(telegramId: number, input: CreateOrderInput): Promise<Order> {
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

    // No PENDING hold for MEDIUM risk — the order goes straight to the
    // kitchen either way. OTP / verbal confirmation (KDS badge) are
    // verification signals layered on top, not a gate on cooking start;
    // see docs/decisions.md's Phase 2 notes for why.
    const orderId = await orderRepository.create({
      userId: telegramId,
      status: "CONFIRMED",
      totalAmount,
      paymentType: input.paymentType,
      latitude: input.latitude,
      longitude: input.longitude,
      landmarkAddress: input.landmarkAddress,
      courierNotes: input.courierNotes ?? null,
      riskLevel,
      items: resolvedItems,
    });

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
      customerName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown",
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

    return toApiOrder(created.order, created.items);
  },

  async getOrder(orderId: number): Promise<Order> {
    const result = await orderRepository.findById(orderId);
    if (!result) throw new NotFoundError(`Order ${orderId} not found`);
    return toApiOrder(result.order, result.items);
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

  async updateStatus(orderId: number, newStatus: OrderStatus, changedBy: ChangedBy): Promise<Order> {
    const existing = await orderRepository.findById(orderId);
    if (!existing) throw new NotFoundError(`Order ${orderId} not found`);

    const currentStatus = existing.order.status as OrderStatus;
    if (!ALLOWED_TRANSITIONS[currentStatus].includes(newStatus)) {
      throw new ConflictError(`Cannot transition order from ${currentStatus} to ${newStatus}`, {
        currentStatus,
        requestedStatus: newStatus,
      });
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

    const userId = existing.order.userId!;

    realtime.orderStatusChanged(orderId, userId, {
      status: newStatus,
      previousStatus: result.previousStatus,
      changedBy,
    });

    if (newStatus === "READY_FOR_DELIVERY") {
      const user = await userRepository.findByTelegramId(userId);
      realtime.courierAssigned(orderId, {
        customerName: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Unknown",
        customerPhone: user?.isPhoneVerified ? user.phoneNumber : null,
        latitude: existing.order.latitude,
        longitude: existing.order.longitude,
        landmarkAddress: existing.order.landmarkAddress,
        paymentType: existing.order.paymentType,
        paymentStatus: existing.order.paymentStatus,
        amountToCollect: existing.order.paymentStatus === "PAID" ? 0 : Number(existing.order.totalAmount),
        courierNotes: existing.order.courierNotes,
      });
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
    const existing = await orderRepository.findById(orderId);
    if (!existing) throw new NotFoundError(`Order ${orderId} not found`);

    if (existing.order.paymentType === "CASH" && existing.order.paymentStatus === "UNPAID") {
      if (!submittedCashCode || submittedCashCode !== existing.order.cashConfirmationCode) {
        throw new ValidationError("Cash confirmation code does not match", { orderId });
      }
    }

    await orderRepository.setDeliveryProof(orderId, photoUrl);
    return this.updateStatus(orderId, "DELIVERED", "COURIER");
  },
};
