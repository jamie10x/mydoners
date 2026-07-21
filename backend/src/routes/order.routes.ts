import { Router } from "express";
import { orderController } from "../controllers/orderController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

export const orderRoutes = Router();

orderRoutes.get("/", requireAuth, asyncHandler(orderController.list));
orderRoutes.post("/", requireAuth, asyncHandler(orderController.create));
orderRoutes.get("/:orderId", requireAuth, asyncHandler(orderController.get));
orderRoutes.patch("/:orderId/status", requireAuth, asyncHandler(orderController.updateStatus));
orderRoutes.patch("/:orderId/dispatch", requireAuth, asyncHandler(orderController.dispatch));
