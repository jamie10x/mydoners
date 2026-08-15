import { Router } from "express";
import { adminController } from "../controllers/adminController";
import { requireAdmin } from "../middleware/adminAuth";
import { asyncHandler } from "../middleware/errorHandler";
import { rateLimit } from "../middleware/rateLimit";
import { productImageUpload } from "../middleware/upload";

export const adminRoutes = Router();

// One shared password guards the whole panel — including every customer's
// phone number and delivery coordinates — so the login endpoint needs a
// throttle. 10 tries per 15 min is far beyond honest mistyping and far below
// anything useful for guessing.
adminRoutes.post(
  "/login",
  rateLimit({
    name: "admin-login",
    max: 10,
    windowSeconds: 900,
    message: "Juda ko'p urinish — 15 daqiqadan so'ng qayta urinib ko'ring.",
  }),
  asyncHandler(adminController.login),
);

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

adminRoutes.get("/analytics", requireAdmin, asyncHandler(adminController.analytics));
adminRoutes.get("/orders", requireAdmin, asyncHandler(adminController.orders));

// "/users/stats" must stay above "/users/:telegramId" — otherwise Express
// matches the param route first and tries to look up a customer named "stats".
adminRoutes.get("/users/stats", requireAdmin, asyncHandler(adminController.userStats));
adminRoutes.get("/users", requireAdmin, asyncHandler(adminController.listUsers));
adminRoutes.get("/users/:telegramId", requireAdmin, asyncHandler(adminController.getUser));
adminRoutes.patch("/users/:telegramId", requireAdmin, asyncHandler(adminController.updateUser));
