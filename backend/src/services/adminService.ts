import { categoryRepository } from "../repositories/categoryRepository";
import { productRepository } from "../repositories/productRepository";
import { NotFoundError } from "../errors/AppError";

function toNum(v: string | null): number | null {
  return v === null ? null : Number(v);
}

function mapProduct(p: Awaited<ReturnType<typeof productRepository.findById>>) {
  if (!p) return null;
  return {
    id: p.id,
    categoryId: p.categoryId,
    name: p.name,
    description: p.description,
    basePrice: toNum(p.basePrice),
    hasMeatChoice: p.hasMeatChoice,
    beefPrice: toNum(p.beefPrice),
    chickenPrice: toNum(p.chickenPrice),
    isAvailable: p.isAvailable,
    imageUrl: p.imageUrl,
  };
}

export const adminService = {
  listCategories() {
    return categoryRepository.listAll();
  },

  createCategory(input: { name: string; displayOrder: number }) {
    return categoryRepository.create(input);
  },

  async updateCategory(id: number, input: Partial<{ name: string; displayOrder: number }>) {
    const updated = await categoryRepository.update(id, input);
    if (!updated) throw new NotFoundError(`Category ${id} not found`);
    return updated;
  },

  deleteCategory(id: number) {
    return categoryRepository.delete(id);
  },

  async listProducts() {
    const rows = await productRepository.listAllForAdmin();
    return rows.map(mapProduct);
  },

  async createProduct(input: {
    categoryId: number;
    name: string;
    description?: string | null;
    hasMeatChoice: boolean;
    basePrice?: number;
    beefPrice?: number;
    chickenPrice?: number;
    isAvailable: boolean;
    imageUrl?: string | null;
  }) {
    const created = await productRepository.create({
      categoryId: input.categoryId,
      name: input.name,
      description: input.description ?? null,
      basePrice: String(input.basePrice ?? 0),
      hasMeatChoice: input.hasMeatChoice,
      beefPrice: input.hasMeatChoice ? String(input.beefPrice) : null,
      chickenPrice: input.hasMeatChoice ? String(input.chickenPrice) : null,
      isAvailable: input.isAvailable,
      imageUrl: input.imageUrl ?? null,
    });
    return mapProduct(created);
  },

  async updateProduct(
    id: number,
    input: Partial<{
      categoryId: number;
      name: string;
      description: string | null;
      hasMeatChoice: boolean;
      basePrice: number;
      beefPrice: number;
      chickenPrice: number;
      isAvailable: boolean;
      imageUrl: string | null;
    }>,
  ) {
    const patch: Record<string, unknown> = {};
    if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.hasMeatChoice !== undefined) patch.hasMeatChoice = input.hasMeatChoice;
    if (input.basePrice !== undefined) patch.basePrice = String(input.basePrice);
    if (input.beefPrice !== undefined) patch.beefPrice = String(input.beefPrice);
    if (input.chickenPrice !== undefined) patch.chickenPrice = String(input.chickenPrice);
    if (input.isAvailable !== undefined) patch.isAvailable = input.isAvailable;
    if (input.imageUrl !== undefined) patch.imageUrl = input.imageUrl;

    const updated = await productRepository.update(id, patch);
    if (!updated) throw new NotFoundError(`Product ${id} not found`);
    return mapProduct(updated);
  },

  deleteProduct(id: number) {
    return productRepository.delete(id);
  },
};
