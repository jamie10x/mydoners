import { categoryRepository } from "../repositories/categoryRepository";
import { productRepository } from "../repositories/productRepository";

export const catalogService = {
  listCategories() {
    return categoryRepository.listAll();
  },

  async listProducts(params: { categoryId?: number; page: number; pageSize: number }) {
    const { items, total } = await productRepository.list(params);
    return { items, page: params.page, pageSize: params.pageSize, total };
  },
};
