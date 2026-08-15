import type { Request, Response } from "express";
import type { OrderStatus } from "@mydoners/shared-contracts";
import { orderService } from "../services/orderService";
import { changedByFor } from "../domain/orderTransitions";
import { createOrderSchema, updateOrderStatusSchema } from "../dto/order.dto";
import { ForbiddenError, ValidationError } from "../errors/AppError";
import { env } from "../config/env";

const VALID_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COOKING",
  "READY_FOR_DELIVERY",
  "ON_THE_WAY",
  "DELIVERED",
  "CANCELLED",
];
const DEFAULT_ACTIVE_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "COOKING", "READY_FOR_DELIVERY"];

function requireCourierBot(req: Request): void {
  if (!(req.actor?.type === "bot" && req.actor.bot === "courier")) {
    throw new ForbiddenError("Faqat kuryer bot uchun");
  }
}

function requireDevice(req: Request): void {
  if (req.actor?.type !== "device") {
    throw new ForbiddenError("Faqat KDS qurilmasi uchun");
  }
}

export const orderController = {
  async list(req: Request, res: Response) {
    // Staff surfaces only (KDS device key, bots) — a customer JWT listing
    // every active order would leak other customers' names/addresses.
    if (req.actor?.type === "user") {
      throw new ForbiddenError("Mijozlar faqat o'z buyurtmalarini id orqali ko'ra oladi");
    }
    const statusParam = req.query.status;
    const requested = typeof statusParam === "string" ? statusParam.split(",") : null;
    const statuses = requested
      ? requested.filter((s): s is OrderStatus => VALID_STATUSES.includes(s as OrderStatus))
      : DEFAULT_ACTIVE_STATUSES;

    if (requested && statuses.length !== requested.length) {
      throw new ValidationError("Status qiymati noto'g'ri", { statusParam });
    }

    res.json(await orderService.listByStatus(statuses));
  },

  // Profile's order-history list — customers only, own orders only.
  async mine(req: Request, res: Response) {
    if (req.actor?.type !== "user") throw new ForbiddenError("Faqat Mini App mijozlari buyurtmalar tarixiga ega");
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    res.json(await orderService.listMine(req.actor.telegramId, limit));
  },

  // KDS's ambient "Today's Sales" screen — light on purpose, see
  // orderService.getTodaySummary. Deep analysis lives in the admin panel.
  async todaySummary(req: Request, res: Response) {
    requireDevice(req);
    res.json(await orderService.getTodaySummary());
  },

  // KDS's "History" screen — today's completed/cancelled orders only;
  // anything still active is already visible in the live queue.
  async todayHistory(req: Request, res: Response) {
    requireDevice(req);
    res.json(await orderService.getTodayHistory());
  },

  // Courier bot's recovery loop — see orderService.getCourierQueue.
  async courierQueue(req: Request, res: Response) {
    requireCourierBot(req);
    res.json(await orderService.getCourierQueue());
  },

  async markCourierNotified(req: Request, res: Response) {
    requireCourierBot(req);
    await orderService.markCourierNotified(Number(req.params.orderId));
    res.status(204).end();
  },

  async create(req: Request, res: Response) {
    if (req.actor?.type !== "user") {
      throw new ForbiddenError("Faqat Mini App mijozlari buyurtma bera oladi");
    }
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Buyurtma ma'lumotlari noto'g'ri", { issues: parsed.error.issues });

    const order = await orderService.createOrder(req.actor.telegramId, parsed.data);
    res.status(201).json(order);
  },

  async get(req: Request, res: Response) {
    const orderId = Number(req.params.orderId);
    // Customers see only their own orders; staff tokens see any.
    if (req.actor?.type === "user") {
      await orderService.assertOwnedBy(orderId, req.actor.telegramId);
    }
    res.json(await orderService.getOrder(orderId));
  },

  async updateStatus(req: Request, res: Response) {
    const orderId = Number(req.params.orderId);
    const parsed = updateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Status yangilash ma'lumotlari noto'g'ri", { issues: parsed.error.issues });

    // changedBy is derived from the authenticated token, not the request
    // body — the body field is kept for backwards compatibility but a
    // courier can no longer write "KITCHEN" into the audit log.
    const actor = req.actor!;
    const order = await orderService.updateStatus(orderId, parsed.data.status, changedByFor(actor), actor);
    res.json(order);
  },

  /**
   * Current courier position for this order, or null.
   *
   * The WebSocket only pushes on change, so a customer opening the Mini App
   * between two ticks would otherwise see an empty map for up to a minute.
   */
  async courierLocation(req: Request, res: Response) {
    const orderId = Number(req.params.orderId);
    if (req.actor?.type === "user") {
      await orderService.assertOwnedBy(orderId, req.actor.telegramId);
    }
    res.json(await orderService.getCourierLocation(orderId));
  },

  async getRisk(req: Request, res: Response) {
    const orderId = Number(req.params.orderId);
    res.json(await orderService.getRiskAssessment(orderId));
  },

  async deliveryProof(req: Request, res: Response) {
    requireCourierBot(req);
    const orderId = Number(req.params.orderId);
    const file = req.file;
    if (!file) throw new ValidationError("Yetkazib berish tasdig'i uchun fotosurat talab qilinadi");

    const photoUrl = `${env.publicApiUrl}/uploads/delivery-proof/${file.filename}`;
    const order = await orderService.confirmDelivery(orderId, photoUrl, req.body.cashConfirmationCode ?? null);
    res.json(order);
  },
};
