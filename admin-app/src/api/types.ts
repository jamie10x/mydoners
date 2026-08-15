import type { Order } from "@mydoners/shared-contracts";

// Matches backend/src/services/adminService.ts's response shapes exactly —
// distinct from the customer-facing Category/Product in shared-contracts
// (admin responses use plain nullable numbers, not the number|string the
// public catalog endpoints return).

export interface AdminCategory {
  id: number;
  name: string;
  displayOrder: number | null;
}

export interface AdminProduct {
  id: number;
  categoryId: number | null;
  name: string;
  description: string | null;
  basePrice: number | null;
  hasMeatChoice: boolean | null;
  beefPrice: number | null;
  chickenPrice: number | null;
  isAvailable: boolean | null;
  imageUrl: string | null;
}

// Customer-management shapes — mirror backend/src/services/adminUserService.ts.
// Deliberately NOT in shared-contracts: that package is for contracts spoken by
// more than one runtime (Mini App, KDS, bots), and these carry customer PII
// that has no business in the bundle shipped to every customer's Telegram.

export type UserSegment =
  | "all"
  | "incomplete_profile"
  | "never_ordered"
  | "lapsed"
  | "repeat"
  | "high_cancel"
  | "blacklisted";

export type UserSort = "createdAt" | "lastOrderAt" | "completedOrdersCount" | "cancelledOrdersCount" | "name";

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
  changedBy: string | null;
  timestamp: string | null;
}

export interface AdminUserDetail extends AdminUser {
  contact: { telegramUrl: string | null; telUrl: string | null };
  savedAddresses: Array<{
    id: number;
    label: string;
    latitude: number;
    longitude: number;
    landmarkAddress: string;
  }>;
  orders: Order[];
  timeline: AdminUserTimelineEntry[];
}
