import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { orderItems, orderLogs, orders, products } from "../db/schema";
import type { ChangedBy, OrderStatus, PaymentType, RiskLevel } from "@mydoners/shared-contracts";

export interface NewOrderItemInput {
  productId: number;
  selectedVariant: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface NewOrderInput {
  userId: number;
  // Phase 1 has no anti-fraud gate, so orders are created straight into
  // CONFIRMED. Phase 2's risk-scoring service will pass "PENDING" here
  // instead when a MEDIUM/HIGH-risk order needs to hold before the kitchen
  // sees it (OTP / verbal confirmation) — see docs/decisions.md and the
  // roadmap's Phase 2 section.
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

  async markPaid(id: number) {
    await db.update(orders).set({ paymentStatus: "PAID" }).where(eq(orders.id, id));
  },

  async setCashConfirmationCode(id: number, code: string) {
    await db.update(orders).set({ cashConfirmationCode: code }).where(eq(orders.id, id));
  },

  async setDeliveryProof(id: number, photoUrl: string) {
    await db.update(orders).set({ deliveryProofPhotoUrl: photoUrl }).where(eq(orders.id, id));
  },

  async markCourierNotified(id: number) {
    await db.update(orders).set({ courierNotifiedAt: new Date() }).where(eq(orders.id, id));
  },

  async updateStatus(id: number, newStatus: OrderStatus, changedBy: ChangedBy) {
    return db.transaction(async (tx) => {
      const [current] = await tx.select().from(orders).where(eq(orders.id, id));
      if (!current) return null;

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

      return { order: updated!, previousStatus: current.status };
    });
  },
};
