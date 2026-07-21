import type { Request, Response } from "express";
import { orderService } from "../services/orderService";
import { createOrderSchema, updateOrderStatusSchema } from "../dto/order.dto";
import { ForbiddenError, ValidationError } from "../errors/AppError";

export const orderController = {
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
};
