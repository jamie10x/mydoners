import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { categories } from "../db/schema";

export const categoryRepository = {
  async listAll() {
    return db.select().from(categories).orderBy(asc(categories.displayOrder));
  },

  async create(input: { name: string; displayOrder: number }) {
    const [created] = await db.insert(categories).values(input).returning();
    if (!created) throw new Error("Failed to create category");
    return created;
  },

  async update(id: number, input: Partial<{ name: string; displayOrder: number }>) {
    const [updated] = await db.update(categories).set(input).where(eq(categories.id, id)).returning();
    return updated ?? null;
  },

  async delete(id: number) {
    await db.delete(categories).where(eq(categories.id, id));
  },
};
