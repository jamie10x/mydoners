import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { catalogRoutes } from "./catalog.routes";
import { orderRoutes } from "./order.routes";
import { userRoutes } from "./user.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/", catalogRoutes);
apiRouter.use("/orders", orderRoutes);
apiRouter.use("/users", userRoutes);
