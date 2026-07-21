import { and, eq, count } from "drizzle-orm";
import { db } from "../db";
import { products } from "../db/schema";

export const productRepository = {
  async list({ categoryId, page, pageSize }: { categoryId?: number; page: number; pageSize: number }) {
    const filters = [eq(products.isAvailable, true)];
    if (categoryId) filters.push(eq(products.categoryId, categoryId));
    const where = and(...filters);

    const [items, countRows] = await Promise.all([
      db
        .select()
        .from(products)
        .where(where)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ total: count() }).from(products).where(where),
    ]);

    return { items, total: Number(countRows[0]?.total ?? 0) };
  },

  async findById(id: number) {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product ?? null;
  },
};
