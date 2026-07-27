import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { orderItems, orderLogs, orders, products } from "../db/schema";
import type { ChangedBy, OrderStatus, PaymentType, RiskLevel } from "@mydoners/shared-contracts";
import { ALLOWED_TRANSITIONS } from "../domain/orderTransitions";

export interface NewOrderItemInput {
  productId: number;
  selectedVariant: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface NewOrderInput {
  userId: number;
  // Always "PENDING" in practice (see orderService.createOrder) — every
  // order waits for the kitchen to accept it after checking stock before
  // the customer sees any progress. Kept as a plain OrderStatus param
  // rather than hardcoding PENDING here so orderRepository.create stays a
  // dumb insert with no opinion about ordering rules.
  status: OrderStatus;
  totalAmount: number;
  paymentType: PaymentType;
  latitude: number;
  longitude: number;
  landmarkAddress: string;
  courierNotes: string | null;
  riskLevel: RiskLevel;
  customerName: string;
  customerPhone: string;
  idempotencyKey: string | null;
  items: NewOrderItemInput[];
}

export const orderRepository = {
  async create(input: NewOrderInput) {
    return db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          userId: input.userId,
          status: input.status,
          totalAmount: input.totalAmount.toFixed(2),
          paymentType: input.paymentType,
          paymentStatus: "UNPAID",
          latitude: input.latitude,
          longitude: input.longitude,
          landmarkAddress: input.landmarkAddress,
          courierNotes: input.courierNotes,
          riskLevel: input.riskLevel,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          idempotencyKey: input.idempotencyKey,
        })
        .returning();

      if (!order) throw new Error("Failed to insert order");

      await tx.insert(orderItems).values(
        input.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          selectedVariant: item.selectedVariant,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          totalPrice: item.totalPrice.toFixed(2),
        })),
      );

      await tx.insert(orderLogs).values({
        orderId: order.id,
        previousStatus: null,
        newStatus: input.status,
        changedBy: "SYSTEM",
      });

      return order.id;
    });
  },

  async findById(id: number) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return null;

    const items = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        productName: products.name,
        selectedVariant: orderItems.selectedVariant,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id));

    return { order, items };
  },

  // Lets the KDS tablet (and, later, the courier bot) recover an accurate
  // work queue on cold start / reconnect instead of relying solely on
  // WebSocket events that may have been missed while disconnected.
  async listByStatus(statuses: OrderStatus[]) {
    const matchingOrders = await db
      .select()
      .from(orders)
      .where(inArray(orders.status, statuses))
      .orderBy(desc(orders.createdAt));

    if (matchingOrders.length === 0) return [];

    const orderIds = matchingOrders.map((o) => o.id);
    const items = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        productName: products.name,
        selectedVariant: orderItems.selectedVariant,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(inArray(orderItems.orderId, orderIds));

    return matchingOrders.map((order) => ({
      order,
      items: items.filter((item) => item.orderId === order.id),
    }));
  },

  // Backs GET /orders/mine — Profile's order-history list.
  async listByUser(userId: number, limit: number) {
    const matchingOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    if (matchingOrders.length === 0) return [];

    const orderIds = matchingOrders.map((o) => o.id);
    const items = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        productName: products.name,
        selectedVariant: orderItems.selectedVariant,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(inArray(orderItems.orderId, orderIds));

    return matchingOrders.map((order) => ({
      order,
      items: items.filter((item) => item.orderId === order.id),
    }));
  },

  async markPaid(id: number) {
    await db.update(orders).set({ paymentStatus: "PAID" }).where(eq(orders.id, id));
  },

  async setCashConfirmationCode(id: number, code: string) {
    await db.update(orders).set({ cashConfirmationCode: code }).where(eq(orders.id, id));
  },

  async setDeliveryProof(id: number, photoUrl: string) {
    await db.update(orders).set({ deliveryProofPhotoUrl: photoUrl }).where(eq(orders.id, id));
  },

  async findByIdempotencyKey(key: string) {
    const [order] = await db.select().from(orders).where(eq(orders.idempotencyKey, key));
    return order ?? null;
  },

  async markCourierNotified(id: number) {
    await db.update(orders).set({ courierNotifiedAt: new Date() }).where(eq(orders.id, id));
  },

  // The row lock (FOR UPDATE) + re-validation inside the transaction is
  // what makes concurrent transitions safe: two racing requests serialize
  // on the lock, and the loser re-reads a status its transition is no
  // longer valid from, getting a clean "conflict" instead of silently
  // clobbering the winner (previously: unlocked read-then-write).
  async updateStatus(id: number, newStatus: OrderStatus, changedBy: ChangedBy) {
    return db.transaction(async (tx) => {
      const [current] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
      if (!current) return null;

      const currentStatus = current.status as OrderStatus;
      if (!ALLOWED_TRANSITIONS[currentStatus].includes(newStatus)) {
        return { conflict: currentStatus as OrderStatus };
      }

      const [updated] = await tx
        .update(orders)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();

      await tx.insert(orderLogs).values({
        orderId: id,
        previousStatus: current.status,
        newStatus,
        changedBy,
      });

      return { order: updated!, previousStatus: currentStatus };
    });
  },

  /**
   * Delivery proof + the DELIVERED transition in ONE transaction, with the
   * cash-code check under the same row lock. Previously the proof was
   * persisted first and the transition could still fail, stranding orders
   * with a photo but the wrong status.
   */
  async confirmDelivery(id: number, photoUrl: string, submittedCashCode: string | null) {
    return db.transaction(async (tx) => {
      const [current] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
      if (!current) return { error: "NOT_FOUND" as const };

      const currentStatus = current.status as OrderStatus;
      if (!ALLOWED_TRANSITIONS[currentStatus].includes("DELIVERED")) {
        return { error: "BAD_STATUS" as const, currentStatus };
      }

      if (current.paymentType === "CASH" && current.paymentStatus === "UNPAID") {
        if (!submittedCashCode || submittedCashCode !== current.cashConfirmationCode) {
          return { error: "BAD_CODE" as const };
        }
      }

      const [updated] = await tx
        .update(orders)
        .set({ status: "DELIVERED", deliveryProofPhotoUrl: photoUrl, updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();

      await tx.insert(orderLogs).values({
        orderId: id,
        previousStatus: currentStatus,
        newStatus: "DELIVERED",
        changedBy: "COURIER",
      });

      return { order: updated!, previousStatus: currentStatus };
    });
  },
};
