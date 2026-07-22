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
    // firstName/lastName are seeded from Telegram only for a brand-new user
    // — deliberately NOT refreshed on every login (onConflictDoUpdate below
    // only touches username). Otherwise a name the customer bot's onboarding
    // conversation sets (which can differ from their Telegram display name)
    // would get silently overwritten the next time they open the Mini App.
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

  async updateProfile(
    telegramId: number,
    patch: { firstName?: string; lastName?: string; phoneNumber?: string },
  ) {
    const set: Record<string, unknown> = {};
    if (patch.firstName !== undefined) set.firstName = patch.firstName;
    if (patch.lastName !== undefined) set.lastName = patch.lastName;
    if (patch.phoneNumber !== undefined) {
      set.phoneNumber = patch.phoneNumber;
      set.isPhoneVerified = true;
    }
    if (Object.keys(set).length === 0) return;
    await db.update(users).set(set).where(eq(users.telegramId, telegramId));
  },
};
