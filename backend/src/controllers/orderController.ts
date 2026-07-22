import type { Request, Response } from "express";
import type { OrderStatus } from "@mydoners/shared-contracts";
import { orderService } from "../services/orderService";
import { otpService } from "../services/otpService";
import { createOrderSchema, updateOrderStatusSchema, verifyOtpSchema } from "../dto/order.dto";
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
const DEFAULT_ACTIVE_STATUSES: OrderStatus[] = ["CONFIRMED", "COOKING", "READY_FOR_DELIVERY"];

export const orderController = {
  async list(req: Request, res: Response) {
    const statusParam = req.query.status;
    const requested = typeof statusParam === "string" ? statusParam.split(",") : null;
    const statuses = requested
      ? requested.filter((s): s is OrderStatus => VALID_STATUSES.includes(s as OrderStatus))
      : DEFAULT_ACTIVE_STATUSES;

    if (requested && statuses.length !== requested.length) {
      throw new ValidationError("Invalid status value in query param", { statusParam });
    }

    res.json(await orderService.listByStatus(statuses));
  },

  async create(req: Request, res: Response) {
    if (req.actor?.type !== "user") {
      throw new ForbiddenError("Only Mini App customers can place orders");
    }
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Invalid order payload", { issues: parsed.error.issues });

    const order = await orderService.createOrder(req.actor.telegramId, parsed.data);
    res.status(201).json(order);
  },

  async get(req: Request, res: Response) {
    const orderId = Number(req.params.orderId);
    res.json(await orderService.getOrder(orderId));
  },

  async updateStatus(req: Request, res: Response) {
    const orderId = Number(req.params.orderId);
    const parsed = updateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Invalid status update payload", { issues: parsed.error.issues });

    const order = await orderService.updateStatus(orderId, parsed.data.status, parsed.data.changedBy);
    res.json(order);
  },

  async dispatch(req: Request, res: Response) {
    const orderId = Number(req.params.orderId);
    const order = await orderService.updateStatus(orderId, "READY_FOR_DELIVERY", "KITCHEN");
    res.json(order);
  },

  async getRisk(req: Request, res: Response) {
    const orderId = Number(req.params.orderId);
    res.json(await orderService.getRiskAssessment(orderId));
  },

  async requestOtp(req: Request, res: Response) {
    const orderId = Number(req.params.orderId);
    await otpService.requestOtp(orderId);
    res.status(202).end();
  },

  async verifyOtp(req: Request, res: Response) {
    const orderId = Number(req.params.orderId);
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Invalid OTP payload", { issues: parsed.error.issues });

    const verified = await otpService.verifyOtp(orderId, parsed.data.code);
    if (!verified) throw new ValidationError("Invalid or expired code", { orderId });
    res.status(200).end();
  },

  async deliveryProof(req: Request, res: Response) {
    const orderId = Number(req.params.orderId);
    const file = req.file;
    if (!file) throw new ValidationError("Delivery-proof photo is required");

    const photoUrl = `${env.publicApiUrl}/uploads/delivery-proof/${file.filename}`;
    const order = await orderService.confirmDelivery(orderId, photoUrl, req.body.cashConfirmationCode ?? null);
    res.json(order);
  },
};
