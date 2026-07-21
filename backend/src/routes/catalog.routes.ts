import { Router } from "express";
import { catalogController } from "../controllers/catalogController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

export const catalogRoutes = Router();

catalogRoutes.get("/categories", requireAuth, asyncHandler(catalogController.listCategories));
catalogRoutes.get("/products", requireAuth, asyncHandler(catalogController.listProducts));
