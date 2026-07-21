import { Router } from "express";
import { authController } from "../controllers/authController";
import { asyncHandler } from "../middleware/errorHandler";

export const authRoutes = Router();

// No requireAuth — this endpoint issues the credential in the first place.
// Matches `security: []` on POST /auth/telegram in docs/openapi.yaml.
authRoutes.post("/telegram", asyncHandler(authController.login));
