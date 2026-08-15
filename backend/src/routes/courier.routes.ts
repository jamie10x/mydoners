import { Router } from "express";
import { courierController } from "../controllers/courierController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

export const courierRoutes = Router();

// Position reports from the courier bot, relayed from Telegram's live-location
// stream. High frequency and best-effort — the bot throttles before calling.
courierRoutes.post("/location", requireAuth, asyncHandler(courierController.reportLocation));
