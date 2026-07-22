import type { Request, Response } from "express";
import { adminService } from "../services/adminService";
import { checkAdminPassword, signAdminToken } from "../middleware/adminAuth";
import {
  adminLoginSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  productCreateSchema,
  productUpdateSchema,
} from "../dto/admin.dto";
import { UnauthorizedError, ValidationError } from "../errors/AppError";

export const adminController = {
  async login(req: Request, res: Response) {
    const parsed = adminLoginSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Password required");
    if (!checkAdminPassword(parsed.data.password)) throw new UnauthorizedError("Incorrect password");
    res.json({ token: signAdminToken() });
  },

  async listCategories(_req: Request, res: Response) {
    res.json(await adminService.listCategories());
  },

  async createCategory(req: Request, res: Response) {
    const parsed = categoryCreateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Invalid category payload", { issues: parsed.error.issues });
    res.status(201).json(await adminService.createCategory(parsed.data));
  },

  async updateCategory(req: Request, res: Response) {
    const parsed = categoryUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Invalid category payload", { issues: parsed.error.issues });
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
    if (!parsed.success) throw new ValidationError("Invalid product payload", { issues: parsed.error.issues });
    res.status(201).json(await adminService.createProduct(parsed.data));
  },

  async updateProduct(req: Request, res: Response) {
    const parsed = productUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Invalid product payload", { issues: parsed.error.issues });
    res.json(await adminService.updateProduct(Number(req.params.id), parsed.data));
  },

  async deleteProduct(req: Request, res: Response) {
    await adminService.deleteProduct(Number(req.params.id));
    res.status(204).end();
  },

  async uploadProductImage(req: Request, res: Response) {
    const file = req.file;
    if (!file) throw new ValidationError("Image file is required");
    const imageUrl = `/uploads/products/${file.filename}`;
    const product = await adminService.updateProduct(Number(req.params.productId), { imageUrl });
    res.json(product);
  },
};
