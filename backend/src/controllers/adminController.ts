import type { Request, Response } from "express";
import type { OrderStatus } from "@mydoners/shared-contracts";
import { adminService } from "../services/adminService";
import { adminUserService } from "../services/adminUserService";
import { orderService } from "../services/orderService";
import { checkAdminPassword, signAdminToken } from "../middleware/adminAuth";
import { env } from "../config/env";
import {
  adminLoginSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  productCreateSchema,
  productUpdateSchema,
} from "../dto/admin.dto";
import { userListQuerySchema, userUpdateSchema } from "../dto/adminUser.dto";
import { resetRateLimit } from "../middleware/rateLimit";
import { UnauthorizedError, ValidationError } from "../errors/AppError";

const VALID_ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COOKING",
  "READY_FOR_DELIVERY",
  "ON_THE_WAY",
  "DELIVERED",
  "CANCELLED",
];

// Shared by /admin/analytics and /admin/orders — defaults to the last 30
// days so the dashboard shows something sensible on first load, before the
// owner has picked a range.
function parseDateRange(query: Request["query"]): { from: Date; to: Date } {
  const to = query.to ? new Date(String(query.to)) : new Date();
  const from = query.from
    ? new Date(String(query.from))
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new ValidationError("Sana oralig'i noto'g'ri", { from: query.from, to: query.to });
  }
  // Inclusive of the whole "to" day when it's a bare date (e.g. "2026-07-28").
  if (typeof query.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
    to.setHours(23, 59, 59, 999);
  }
  return { from, to };
}

export const adminController = {
  async login(req: Request, res: Response) {
    const parsed = adminLoginSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Parol talab qilinadi");
    if (!checkAdminPassword(parsed.data.password)) throw new UnauthorizedError("Parol noto'g'ri");
    // Clear the throttle on success so day-to-day logins never count toward a
    // lockout — only failed guesses accumulate.
    await resetRateLimit("admin-login", req);
    res.json({ token: signAdminToken() });
  },

  async listCategories(_req: Request, res: Response) {
    res.json(await adminService.listCategories());
  },

  async createCategory(req: Request, res: Response) {
    const parsed = categoryCreateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Kategoriya ma'lumotlari noto'g'ri", { issues: parsed.error.issues });
    res.status(201).json(await adminService.createCategory(parsed.data));
  },

  async updateCategory(req: Request, res: Response) {
    const parsed = categoryUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Kategoriya ma'lumotlari noto'g'ri", { issues: parsed.error.issues });
    res.json(await adminService.updateCategory(Number(req.params.id), parsed.data));
  },

  async deleteCategory(req: Request, res: Response) {
    await adminService.deleteCategory(Number(req.params.id));
    res.status(204).end();
  },

  async listProducts(_req: Request, res: Response) {
    res.json(await adminService.listProducts());
  },

  async createProduct(req: Request, res: Response) {
    const parsed = productCreateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Mahsulot ma'lumotlari noto'g'ri", { issues: parsed.error.issues });
    res.status(201).json(await adminService.createProduct(parsed.data));
  },

  async updateProduct(req: Request, res: Response) {
    const parsed = productUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Mahsulot ma'lumotlari noto'g'ri", { issues: parsed.error.issues });
    res.json(await adminService.updateProduct(Number(req.params.id), parsed.data));
  },

  async deleteProduct(req: Request, res: Response) {
    await adminService.deleteProduct(Number(req.params.id));
    res.status(204).end();
  },

  async uploadProductImage(req: Request, res: Response) {
    const file = req.file;
    if (!file) throw new ValidationError("Rasm fayli talab qilinadi");
    const imageUrl = `${env.publicApiUrl}/uploads/products/${file.filename}`;
    const product = await adminService.updateProduct(Number(req.params.productId), { imageUrl });
    res.json(product);
  },

  // Dashboard's summary card — revenue/order count/top products for a
  // date range (defaults to the last 30 days).
  async analytics(req: Request, res: Response) {
    const { from, to } = parseDateRange(req.query);
    res.json(await orderService.getSalesSummary(from, to));
  },

  // Dashboard's filterable order-history table.
  async orders(req: Request, res: Response) {
    const { from, to } = parseDateRange(req.query);

    const statusParam = req.query.status;
    const statuses = typeof statusParam === "string" ? statusParam.split(",") : null;
    if (statuses && statuses.some((s) => !VALID_ORDER_STATUSES.includes(s as OrderStatus))) {
      throw new ValidationError("Status qiymati noto'g'ri", { status: statusParam });
    }

    const allMatching = await orderService.listOrdersInRange(from, to, statuses as OrderStatus[] | null);

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    res.json({ total: allMatching.length, orders: allMatching.slice(offset, offset + limit) });
  },

  // Customer list — searchable, segmentable, and paginated in SQL (unlike
  // `orders` above, which still slices in memory).
  async listUsers(req: Request, res: Response) {
    const parsed = userListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError("Mijozlar filtri noto'g'ri", { issues: parsed.error.issues });
    }
    const { q, ...rest } = parsed.data;
    res.json(await adminUserService.list({ ...rest, q: q ?? null }));
  },

  async userStats(req: Request, res: Response) {
    const { from, to } = parseDateRange(req.query);
    res.json(await adminUserService.stats(from, to));
  },

  async getUser(req: Request, res: Response) {
    const telegramId = Number(req.params.telegramId);
    if (!Number.isFinite(telegramId)) throw new ValidationError("Mijoz ID raqami noto'g'ri");
    res.json(await adminUserService.detail(telegramId));
  },

  async updateUser(req: Request, res: Response) {
    const telegramId = Number(req.params.telegramId);
    if (!Number.isFinite(telegramId)) throw new ValidationError("Mijoz ID raqami noto'g'ri");
    const parsed = userUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Mijoz ma'lumotlari noto'g'ri", { issues: parsed.error.issues });
    }
    res.json(await adminUserService.setBlacklisted(telegramId, parsed.data.isBlacklisted));
  },
};
