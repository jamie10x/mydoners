import { Router } from "express";
import { orderController } from "../controllers/orderController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { deliveryProofUpload } from "../middleware/upload";

export const orderRoutes = Router();

orderRoutes.get("/", requireAuth, asyncHandler(orderController.list));
orderRoutes.post("/", requireAuth, asyncHandler(orderController.create));
orderRoutes.get("/:orderId", requireAuth, asyncHandler(orderController.get));
orderRoutes.patch("/:orderId/status", requireAuth, asyncHandler(orderController.updateStatus));
orderRoutes.patch("/:orderId/dispatch", requireAuth, asyncHandler(orderController.dispatch));
orderRoutes.get("/:orderId/risk", requireAuth, asyncHandler(orderController.getRisk));
orderRoutes.post("/:orderId/otp/request", requireAuth, asyncHandler(orderController.requestOtp));
orderRoutes.post("/:orderId/otp/verify", requireAuth, asyncHandler(orderController.verifyOtp));
orderRoutes.post(
  "/:orderId/delivery-proof",
  requireAuth,
  deliveryProofUpload.single("photo"),
  asyncHandler(orderController.deliveryProof),
);
