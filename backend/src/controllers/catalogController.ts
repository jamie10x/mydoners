import type { Request, Response } from "express";
import { catalogService } from "../services/catalogService";

export const catalogController = {
  async listCategories(_req: Request, res: Response) {
    res.json(await catalogService.listCategories());
  },

  async listProducts(req: Request, res: Response) {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 50;
    res.json(await catalogService.listProducts({ categoryId, page, pageSize }));
  },
};
