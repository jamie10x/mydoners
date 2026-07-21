import type { ChangedBy, Order, OrderStatus } from "@mydoners/shared-contracts";
import { orderRepository, type NewOrderItemInput } from "../repositories/orderRepository";
import { productRepository } from "../repositories/productRepository";
import { userRepository } from "../repositories/userRepository";
import { ConflictError, NotFoundError, ValidationError } from "../errors/AppError";
import { realtime } from "../ws/socket";
import type { CreateOrderInput } from "../dto/order.dto";
import type { orders } from "../db/schema";

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
    createdAt: order.createdAt!.toISOString(),
    updatedAt: order.updatedAt!.toISOString(),
  };
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

    // Phase 1 has no anti-fraud gate — every order is auto-confirmed. Phase 2's
    // risk-scoring service will insert a decision point here.
    const orderId = await orderRepository.create({
      userId: telegramId,
      status: "CONFIRMED",
      totalAmount,
      paymentType: input.paymentType,
      latitude: input.latitude,
      longitude: input.longitude,
      landmarkAddress: input.landmarkAddress,
      courierNotes: input.courierNotes ?? null,
      items: resolvedItems,
    });

    const created = await orderRepository.findById(orderId);
    if (!created) throw new Error("Order vanished immediately after creation");

    const user = await userRepository.findByTelegramId(telegramId);

    realtime.orderCreated(orderId, {
      status: created.order.status,
      customerName: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Unknown",
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

    return toApiOrder(created.order, created.items);
  },

  async getOrder(orderId: number): Promise<Order> {
    const result = await orderRepository.findById(orderId);
    if (!result) throw new NotFoundError(`Order ${orderId} not found`);
    return toApiOrder(result.order, result.items);
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
        proofPhotoUrl: null, // Phase 2 — delivery-proof photo capture
      });
    }

    return this.getOrder(orderId);
  },
};
