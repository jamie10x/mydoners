import type { ChangedBy, Order, SavedAddress } from "@mydoners/shared-contracts";
import { orderRepository } from "../repositories/orderRepository";
import { savedAddressRepository } from "../repositories/savedAddressRepository";
import { userRepository, type ListUsersParams } from "../repositories/userRepository";
import { orderService } from "./orderService";
import { NotFoundError } from "../errors/AppError";

// How much history the detail view pulls. Both are "enough to understand this
// customer during a support conversation", not a full export.
const DETAIL_ORDER_LIMIT = 50;
const DETAIL_LOG_LIMIT = 200;

export interface AdminUser {
  telegramId: number;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phoneNumber: string | null;
  isPhoneVerified: boolean;
  isProfileComplete: boolean;
  isBlacklisted: boolean;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  savedAddressCount: number;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  createdAt: string | null;
}

export interface AdminUserStats {
  totalUsers: number;
  newInRange: number;
  activeInRange: number;
  incompleteProfiles: number;
  blacklisted: number;
}

export interface AdminUserTimelineEntry {
  orderId: number;
  previousStatus: string | null;
  newStatus: string | null;
  changedBy: ChangedBy | null;
  timestamp: string | null;
}

/**
 * How the owner can actually reach this customer. `tg://user?id=` is
 * deliberately not offered: it only opens a chat for people already in your
 * contacts, so surfacing it as a link would mostly produce dead taps.
 */
export interface AdminUserContact {
  telegramUrl: string | null;
  telUrl: string | null;
}

export interface AdminUserDetail extends AdminUser {
  contact: AdminUserContact;
  savedAddresses: SavedAddress[];
  orders: Order[];
  timeline: AdminUserTimelineEntry[];
}

type UserRow = Awaited<ReturnType<typeof userRepository.listForAdmin>>[number];

function buildContact(username: string | null, phoneNumber: string | null): AdminUserContact {
  return {
    telegramUrl: username ? `https://t.me/${username}` : null,
    // Telegram renders these as tap-to-call on mobile; strip spacing so the
    // dialer gets a clean number.
    telUrl: phoneNumber ? `tel:${phoneNumber.replace(/[^\d+]/g, "")}` : null,
  };
}

function toAdminUser(
  row: UserRow,
  aggregate: { orderCount: number; totalSpent: number } | undefined,
  addressCount: number,
): AdminUser {
  return {
    telegramId: row.telegramId,
    firstName: row.firstName,
    lastName: row.lastName,
    username: row.username,
    phoneNumber: row.phoneNumber,
    isPhoneVerified: row.isPhoneVerified ?? false,
    // Same rule as userService.mapPublicUser's isProfileComplete, evaluated
    // here from data we already have rather than re-querying per user.
    isProfileComplete: Boolean(row.firstName && row.lastName && row.phoneNumber && addressCount > 0),
    isBlacklisted: row.isBlacklisted ?? false,
    completedOrdersCount: row.completedOrdersCount ?? 0,
    cancelledOrdersCount: row.cancelledOrdersCount ?? 0,
    savedAddressCount: addressCount,
    orderCount: aggregate?.orderCount ?? 0,
    totalSpent: aggregate?.totalSpent ?? 0,
    lastOrderAt: row.lastOrderAt ? new Date(row.lastOrderAt).toISOString() : null,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  };
}

export const adminUserService = {
  /**
   * Four queries total, regardless of page size: count + page, then the page's
   * order aggregates and address counts batched by id. Deliberately avoids
   * userService.mapPublicUser, which runs one address count per user.
   */
  async list(params: ListUsersParams): Promise<{ total: number; users: AdminUser[] }> {
    const [total, rows] = await Promise.all([
      userRepository.countForAdmin(params),
      userRepository.listForAdmin(params),
    ]);

    const ids = rows.map((row) => row.telegramId);
    const [aggregates, addressCounts] = await Promise.all([
      userRepository.aggregatesForUsers(ids),
      userRepository.savedAddressCountsForUsers(ids),
    ]);

    const aggregateById = new Map(aggregates.map((a) => [a.userId, a]));
    const addressCountById = new Map(addressCounts.map((a) => [a.userId, a.addressCount]));

    return {
      total,
      users: rows.map((row) =>
        toAdminUser(row, aggregateById.get(row.telegramId), addressCountById.get(row.telegramId) ?? 0),
      ),
    };
  },

  async stats(from: Date, to: Date): Promise<AdminUserStats> {
    return userRepository.statsSummary(from, to);
  },

  async detail(telegramId: number): Promise<AdminUserDetail> {
    const user = await userRepository.findByTelegramId(telegramId);
    if (!user) throw new NotFoundError(`${telegramId} raqamli mijoz topilmadi`);

    const [addresses, orders, timeline, aggregates] = await Promise.all([
      savedAddressRepository.listByUser(telegramId),
      orderService.listMine(telegramId, DETAIL_ORDER_LIMIT),
      orderRepository.listLogsForUser(telegramId, DETAIL_LOG_LIMIT),
      userRepository.aggregatesForUsers([telegramId]),
    ]);

    const base = toAdminUser(
      { ...user, lastOrderAt: null },
      aggregates[0],
      addresses.length,
    );

    return {
      ...base,
      // Derived from the orders we just fetched rather than a second query —
      // listMine already returns them newest-first.
      lastOrderAt: orders[0]?.createdAt ?? null,
      contact: buildContact(user.username, user.phoneNumber),
      savedAddresses: addresses.map((row) => ({
        id: row.id,
        label: row.label,
        latitude: row.latitude,
        longitude: row.longitude,
        landmarkAddress: row.landmarkAddress,
      })),
      orders,
      timeline: timeline.map((entry) => ({
        orderId: entry.orderId!,
        previousStatus: entry.previousStatus,
        newStatus: entry.newStatus,
        changedBy: entry.changedBy as ChangedBy | null,
        timestamp: entry.timestamp ? entry.timestamp.toISOString() : null,
      })),
    };
  },

  /**
   * The write path for `users.is_blacklisted`. The column has existed and been
   * read by riskService since inception, but nothing could ever set it — this
   * is it. Takes effect on the customer's next order with no cache to bust.
   */
  async setBlacklisted(telegramId: number, isBlacklisted: boolean): Promise<AdminUser> {
    const row = await userRepository.setBlacklisted(telegramId, isBlacklisted);
    if (!row) throw new NotFoundError(`${telegramId} raqamli mijoz topilmadi`);

    const [aggregates, addressCount] = await Promise.all([
      userRepository.aggregatesForUsers([telegramId]),
      savedAddressRepository.countByUser(telegramId),
    ]);
    return toAdminUser({ ...row, lastOrderAt: null }, aggregates[0], addressCount);
  },
};
