import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import type { TelegramInitDataUser } from "../middleware/auth";

export const userRepository = {
  async findByTelegramId(telegramId: number) {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user ?? null;
  },

  async upsertFromTelegram(profile: TelegramInitDataUser) {
    const [user] = await db
      .insert(users)
      .values({
        telegramId: profile.telegramId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        username: profile.username,
      })
      .onConflictDoUpdate({
        target: users.telegramId,
        set: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          username: profile.username,
        },
      })
      .returning();
    if (!user) throw new Error("Failed to upsert user");
    return user;
  },

  async incrementCompletedOrders(telegramId: number) {
    await db
      .update(users)
      .set({ completedOrdersCount: sql`${users.completedOrdersCount} + 1` })
      .where(eq(users.telegramId, telegramId));
  },

  async incrementCancelledOrders(telegramId: number) {
    await db
      .update(users)
      .set({ cancelledOrdersCount: sql`${users.cancelledOrdersCount} + 1` })
      .where(eq(users.telegramId, telegramId));
  },

  async setPhoneVerified(telegramId: number, phoneNumber: string) {
    await db
      .update(users)
      .set({ phoneNumber, isPhoneVerified: true })
      .where(eq(users.telegramId, telegramId));
  },

  async setHomeAddress(telegramId: number, latitude: number, longitude: number, landmarkAddress: string) {
    await db
      .update(users)
      .set({ homeLatitude: latitude, homeLongitude: longitude, homeLandmarkAddress: landmarkAddress })
      .where(eq(users.telegramId, telegramId));
  },
};
