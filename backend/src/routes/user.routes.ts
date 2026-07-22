import { Router } from "express";
import { userController } from "../controllers/userController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

export const userRoutes = Router();

userRoutes.post("/:telegramId/phone-verify", requireAuth, asyncHandler(userController.verifyPhone));
userRoutes.post("/:telegramId/location-request", requireAuth, asyncHandler(userController.requestLocation));
userRoutes.get("/:telegramId/location", requireAuth, asyncHandler(userController.getLocation));
userRoutes.post("/:telegramId/location", requireAuth, asyncHandler(userController.submitLocation));
userRoutes.put("/:telegramId/home-address", requireAuth, asyncHandler(userController.saveHomeAddress));
