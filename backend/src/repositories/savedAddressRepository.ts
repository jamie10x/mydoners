import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { savedAddresses } from "../db/schema";

export const savedAddressRepository = {
  async listByUser(userId: number) {
    return db.select().from(savedAddresses).where(eq(savedAddresses.userId, userId)).orderBy(savedAddresses.id);
  },

  async countByUser(userId: number): Promise<number> {
    const rows = await db.select().from(savedAddresses).where(eq(savedAddresses.userId, userId));
    return rows.length;
  },

  async findById(id: number, userId: number) {
    const [row] = await db
      .select()
      .from(savedAddresses)
      .where(and(eq(savedAddresses.id, id), eq(savedAddresses.userId, userId)));
    return row ?? null;
  },

  async create(userId: number, label: string, latitude: number, longitude: number, landmarkAddress: string) {
    const [row] = await db
      .insert(savedAddresses)
      .values({ userId, label, latitude, longitude, landmarkAddress })
      .returning();
    return row;
  },

  async update(
    id: number,
    userId: number,
    patch: Partial<{ label: string; latitude: number; longitude: number; landmarkAddress: string }>,
  ) {
    const [row] = await db
      .update(savedAddresses)
      .set(patch)
      .where(and(eq(savedAddresses.id, id), eq(savedAddresses.userId, userId)))
      .returning();
    return row ?? null;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const deleted = await db
      .delete(savedAddresses)
      .where(and(eq(savedAddresses.id, id), eq(savedAddresses.userId, userId)))
      .returning();
    return deleted.length > 0;
  },
};
