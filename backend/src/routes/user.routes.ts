import { Router } from "express";
import { userController } from "../controllers/userController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

export const userRoutes = Router();

userRoutes.post("/:telegramId/phone-verify", requireAuth, asyncHandler(userController.verifyPhone));
