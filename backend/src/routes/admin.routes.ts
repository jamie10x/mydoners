import { Router } from "express";
import { adminController } from "../controllers/adminController";
import { requireAdmin } from "../middleware/adminAuth";
import { asyncHandler } from "../middleware/errorHandler";
import { productImageUpload } from "../middleware/upload";

export const adminRoutes = Router();

adminRoutes.post("/login", asyncHandler(adminController.login));

adminRoutes.get("/categories", requireAdmin, asyncHandler(adminController.listCategories));
adminRoutes.post("/categories", requireAdmin, asyncHandler(adminController.createCategory));
adminRoutes.patch("/categories/:id", requireAdmin, asyncHandler(adminController.updateCategory));
adminRoutes.delete("/categories/:id", requireAdmin, asyncHandler(adminController.deleteCategory));

adminRoutes.get("/products", requireAdmin, asyncHandler(adminController.listProducts));
adminRoutes.post("/products", requireAdmin, asyncHandler(adminController.createProduct));
adminRoutes.patch("/products/:id", requireAdmin, asyncHandler(adminController.updateProduct));
adminRoutes.delete("/products/:id", requireAdmin, asyncHandler(adminController.deleteProduct));
adminRoutes.post(
  "/products/:productId/image",
  requireAdmin,
  productImageUpload.single("image"),
  asyncHandler(adminController.uploadProductImage),
);
