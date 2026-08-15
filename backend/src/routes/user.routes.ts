import { Router } from "express";
import { userController } from "../controllers/userController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

export const userRoutes = Router();

userRoutes.get("/:telegramId", requireAuth, asyncHandler(userController.getProfile));
userRoutes.put("/:telegramId/profile", requireAuth, asyncHandler(userController.updateProfile));
// Called by the customer bot on /start — see userController.recordContact.
userRoutes.post("/:telegramId/seen", requireAuth, asyncHandler(userController.recordContact));
userRoutes.post("/:telegramId/phone-verify", requireAuth, asyncHandler(userController.verifyPhone));
userRoutes.post("/:telegramId/location-request", requireAuth, asyncHandler(userController.requestLocation));
userRoutes.get("/:telegramId/location", requireAuth, asyncHandler(userController.getLocation));
userRoutes.post("/:telegramId/location", requireAuth, asyncHandler(userController.submitLocation));

userRoutes.get("/:telegramId/addresses", requireAuth, asyncHandler(userController.listAddresses));
userRoutes.post("/:telegramId/addresses", requireAuth, asyncHandler(userController.createAddress));
userRoutes.patch("/:telegramId/addresses/:addressId", requireAuth, asyncHandler(userController.updateAddress));
userRoutes.delete("/:telegramId/addresses/:addressId", requireAuth, asyncHandler(userController.deleteAddress));
