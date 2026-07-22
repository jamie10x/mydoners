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

  /** Admin-only — includes unavailable products, unlike list() above which customers use. */
  async listAllForAdmin() {
    return db.select().from(products).orderBy(products.categoryId, products.id);
  },

  async create(input: {
    categoryId: number;
    name: string;
    description: string | null;
    basePrice: string;
    hasMeatChoice: boolean;
    beefPrice: string | null;
    chickenPrice: string | null;
    isAvailable: boolean;
    imageUrl: string | null;
  }) {
    const [created] = await db.insert(products).values(input).returning();
    if (!created) throw new Error("Failed to create product");
    return created;
  },

  async update(
    id: number,
    input: Partial<{
      categoryId: number;
      name: string;
      description: string | null;
      basePrice: string;
      hasMeatChoice: boolean;
      beefPrice: string | null;
      chickenPrice: string | null;
      isAvailable: boolean;
      imageUrl: string | null;
    }>,
  ) {
    const [updated] = await db.update(products).set(input).where(eq(products.id, id)).returning();
    return updated ?? null;
  },

  async delete(id: number) {
    await db.delete(products).where(eq(products.id, id));
  },
};
