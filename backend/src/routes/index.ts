import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { catalogRoutes } from "./catalog.routes";
import { orderRoutes } from "./order.routes";
import { userRoutes } from "./user.routes";
import { adminRoutes } from "./admin.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/", catalogRoutes);
apiRouter.use("/orders", orderRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/admin", adminRoutes);
