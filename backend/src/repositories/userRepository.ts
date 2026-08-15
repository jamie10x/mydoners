import { and, asc, desc, eq, exists, gte, ilike, inArray, lte, not, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { orders, savedAddresses, users } from "../db/schema";
import type { TelegramInitDataUser } from "../middleware/auth";

export type UserSegment =
  | "all"
  | "incomplete_profile"
  | "never_ordered"
  | "lapsed"
  | "repeat"
  | "high_cancel"
  | "blacklisted";

export type UserSort = "createdAt" | "lastOrderAt" | "completedOrdersCount" | "cancelledOrdersCount" | "name";

export interface ListUsersParams {
  q: string | null;
  segment: UserSegment;
  lapsedDays: number;
  sort: UserSort;
  order: "asc" | "desc";
  limit: number;
  offset: number;
}

export type UserFilter = Pick<ListUsersParams, "q" | "segment" | "lapsedDays">;

// "Most recent order for this user", as a correlated scalar subquery rather
// than a join+GROUP BY — it has to exist before LIMIT so the list can sort on
// it. Index-backed by orders_user_id_created_at_idx.
const lastOrderAtSql = sql<Date | null>`(
  select max(${orders.createdAt}) from ${orders} where ${orders.userId} = ${users.telegramId}
)`;

const hasAnyOrder = () =>
  exists(db.select({ one: sql`1` }).from(orders).where(eq(orders.userId, users.telegramId)));

const hasOrderSince = (since: Date) =>
  exists(
    db
      .select({ one: sql`1` })
      .from(orders)
      .where(and(eq(orders.userId, users.telegramId), gte(orders.createdAt, since))),
  );

const hasSavedAddress = () =>
  exists(db.select({ one: sql`1` }).from(savedAddresses).where(eq(savedAddresses.userId, users.telegramId)));

/**
 * Mirrors userService.mapPublicUser's isProfileComplete rule exactly — names,
 * phone, and at least one saved address. Kept as SQL so the admin list can
 * filter and count on it without materialising every user.
 */
const isProfileIncomplete = (): SQL =>
  or(
    sql`coalesce(${users.firstName}, '') = ''`,
    sql`coalesce(${users.lastName}, '') = ''`,
    sql`coalesce(${users.phoneNumber}, '') = ''`,
    not(hasSavedAddress()),
  )!;

function segmentCondition(segment: UserSegment, lapsedDays: number): SQL | undefined {
  switch (segment) {
    case "all":
      return undefined;
    case "incomplete_profile":
      return isProfileIncomplete();
    // Deliberately "has no orders row at all", not completedOrdersCount = 0 —
    // that counter only tracks DELIVERED, so someone mid-first-order would
    // otherwise show up as never having ordered.
    case "never_ordered":
      return not(hasAnyOrder());
    case "lapsed":
      return and(hasAnyOrder(), not(hasOrderSince(new Date(Date.now() - lapsedDays * 86_400_000))));
    case "repeat":
      return gte(users.completedOrdersCount, 2);
    // Both an absolute floor and a rate, so a good customer with 2 cancels
    // out of 40 orders isn't flagged alongside someone who cancels half.
    case "high_cancel":
      return and(
        gte(users.cancelledOrdersCount, 2),
        sql`${users.cancelledOrdersCount}::float
            / greatest(coalesce(${users.completedOrdersCount}, 0) + coalesce(${users.cancelledOrdersCount}, 0), 1)
            >= 0.3`,
      );
    case "blacklisted":
      return eq(users.isBlacklisted, true);
  }
}

function searchCondition(q: string): SQL | undefined {
  // Drop a leading "@" so pasting a Telegram handle straight from the chat
  // ("@some_user") matches the bare username we store.
  const trimmed = q.trim().replace(/^@/, "");
  if (!trimmed) return undefined;
  const like = `%${trimmed}%`;
  const digits = trimmed.replace(/\D/g, "");

  const clauses: (SQL | undefined)[] = [
    ilike(sql`coalesce(${users.firstName}, '') || ' ' || coalesce(${users.lastName}, '')`, like),
    ilike(users.username, like),
    ilike(users.phoneNumber, like),
    // Phone numbers are stored as Telegram hands them over ("+998 90 123 45 67"),
    // so a digits-only query never matches the raw column — strip separators
    // on both sides before comparing.
    digits.length >= 4
      ? sql`regexp_replace(coalesce(${users.phoneNumber}, ''), '\\D', '', 'g') like ${`%${digits}%`}`
      : undefined,
    /^\d+$/.test(trimmed) ? eq(users.telegramId, Number(trimmed)) : undefined,
  ];

  return or(...clauses.filter((c): c is SQL => c !== undefined));
}

/**
 * Single source of truth for the admin list's WHERE clause — used by both
 * listForAdmin and countForAdmin so the page and its total can never disagree.
 */
export function buildUserFilter(params: UserFilter): SQL | undefined {
  const conditions = [segmentCondition(params.segment, params.lapsedDays)];
  if (params.q) conditions.push(searchCondition(params.q));
  const present = conditions.filter((c): c is SQL => c !== undefined);
  return present.length > 0 ? and(...present) : undefined;
}

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

  // Upsert, not a plain UPDATE: this is called from the customer bot's
  // onboarding flow (see docs on the /profile route), which can reach a
  // telegramId that has never opened the Mini App — the only other place a
  // `users` row gets created (upsertFromTelegram, above). A plain UPDATE
  // against a nonexistent row silently affects 0 rows and the caller's
  // subsequent findByTelegramId comes back null, which is exactly the
  // "User not found after updating profile" failure this replaces.
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
    await db
      .insert(users)
      .values({ telegramId, ...set })
      .onConflictDoUpdate({ target: users.telegramId, set });
  },

  // Same reasoning as updateProfile above — lets savedAddressService.create
  // insert a row for a bot-onboarding user who doesn't have a `users` row
  // yet, instead of failing the address insert's foreign key constraint.
  async ensureExists(telegramId: number) {
    await db.insert(users).values({ telegramId }).onConflictDoNothing();
  },

  // --- Admin customer list -------------------------------------------------
  // Everything below is admin-only and paginates in SQL. Deliberately does NOT
  // go through userService.mapPublicUser: that helper runs one saved-address
  // count per user, which is an N+1 on any list. Display aggregates are
  // batched separately, after LIMIT (see aggregatesForUsers).

  async listForAdmin(params: ListUsersParams) {
    const sortColumn = {
      createdAt: users.createdAt,
      lastOrderAt: lastOrderAtSql,
      completedOrdersCount: users.completedOrdersCount,
      cancelledOrdersCount: users.cancelledOrdersCount,
      name: sql`coalesce(${users.firstName}, '') || ' ' || coalesce(${users.lastName}, '')`,
    }[params.sort];

    return db
      .select({
        telegramId: users.telegramId,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        phoneNumber: users.phoneNumber,
        isPhoneVerified: users.isPhoneVerified,
        completedOrdersCount: users.completedOrdersCount,
        cancelledOrdersCount: users.cancelledOrdersCount,
        isBlacklisted: users.isBlacklisted,
        createdAt: users.createdAt,
        lastOrderAt: lastOrderAtSql,
      })
      .from(users)
      .where(buildUserFilter(params))
      // NULLS LAST matters for lastOrderAt: Postgres puts NULLs first on DESC,
      // which would top a "most recent order" sort with people who have never
      // ordered at all. The telegramId tiebreaker is also load-bearing —
      // without it, users sharing a createdAt (bot onboarding creates them in
      // bursts) can repeat across pages or be skipped entirely.
      .orderBy(
        params.order === "asc" ? sql`${sortColumn} asc nulls last` : sql`${sortColumn} desc nulls last`,
        asc(users.telegramId),
      )
      .limit(params.limit)
      .offset(params.offset);
  },

  async countForAdmin(params: UserFilter): Promise<number> {
    const [row] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(users)
      .where(buildUserFilter(params));
    return row?.total ?? 0;
  },

  /** Order counts + spend for one page of users, in a single grouped query. */
  async aggregatesForUsers(telegramIds: number[]) {
    if (telegramIds.length === 0) return [];
    return db
      .select({
        userId: orders.userId,
        orderCount: sql<number>`count(*)::int`,
        deliveredCount: sql<number>`count(*) filter (where ${orders.status} = 'DELIVERED')::int`,
        // Spend counts DELIVERED only — a cancelled order was never money.
        totalSpent: sql<number>`coalesce(sum(${orders.totalAmount}) filter (where ${orders.status} = 'DELIVERED'), 0)::float`,
      })
      .from(orders)
      .where(inArray(orders.userId, telegramIds))
      .groupBy(orders.userId);
  },

  async savedAddressCountsForUsers(telegramIds: number[]) {
    if (telegramIds.length === 0) return [];
    return db
      .select({ userId: savedAddresses.userId, addressCount: sql<number>`count(*)::int` })
      .from(savedAddresses)
      .where(inArray(savedAddresses.userId, telegramIds))
      .groupBy(savedAddresses.userId);
  },

  async statsSummary(from: Date, to: Date) {
    // The date bounds go through gte/lte rather than being interpolated
    // directly into the sql template: a bare `${from}` carries no column type,
    // so the driver gets a raw Date it can't bind and throws.
    const [totals] = await db
      .select({
        totalUsers: sql<number>`count(*)::int`,
        newInRange: sql<number>`count(*) filter (where ${and(gte(users.createdAt, from), lte(users.createdAt, to))})::int`,
        blacklisted: sql<number>`count(*) filter (where ${users.isBlacklisted})::int`,
        incompleteProfiles: sql<number>`count(*) filter (where ${isProfileIncomplete()})::int`,
      })
      .from(users);

    const [active] = await db
      .select({ activeInRange: sql<number>`count(distinct ${orders.userId})::int` })
      .from(orders)
      .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)));

    return {
      totalUsers: totals?.totalUsers ?? 0,
      newInRange: totals?.newInRange ?? 0,
      activeInRange: active?.activeInRange ?? 0,
      incompleteProfiles: totals?.incompleteProfiles ?? 0,
      blacklisted: totals?.blacklisted ?? 0,
    };
  },

  async setBlacklisted(telegramId: number, isBlacklisted: boolean) {
    const [row] = await db
      .update(users)
      .set({ isBlacklisted })
      .where(eq(users.telegramId, telegramId))
      .returning();
    return row ?? null;
  },
};
