import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  bigint,
  timestamp,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  displayOrder: integer("display_order").default(0),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
  hasMeatChoice: boolean("has_meat_choice").default(false),
  beefPrice: numeric("beef_price", { precision: 12, scale: 2 }),
  chickenPrice: numeric("chicken_price", { precision: 12, scale: 2 }),
  isAvailable: boolean("is_available").default(true),
  imageUrl: text("image_url"),
});

export const users = pgTable("users", {
  telegramId: bigint("telegram_id", { mode: "number" }).primaryKey(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  username: varchar("username", { length: 100 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  isPhoneVerified: boolean("is_phone_verified").default(false),
  completedOrdersCount: integer("completed_orders_count").default(0),
  cancelledOrdersCount: integer("cancelled_orders_count").default(0),
  isBlacklisted: boolean("is_blacklisted").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Up to 3 per user (enforced in savedAddressService, not here) — Home, Work,
// or any custom label. Replaced the single home-address columns that used
// to live on `users` once more than one saved spot was needed.
export const savedAddresses = pgTable("saved_addresses", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number" })
    .references(() => users.telegramId, { onDelete: "cascade" })
    .notNull(),
  label: varchar("label", { length: 50 }).notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  landmarkAddress: text("landmark_address").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// order_status, payment_type, payment_status are enforced at the app layer via
// the OrderStatus / PaymentType / PaymentStatus TS unions (see docs/openapi.yaml)
// rather than a Postgres ENUM type, so adding a new status doesn't require a
// migration — matches the roadmap's "enums for order_status/..." intent without
// the schema-migration friction of native pg enums during early iteration.
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number" }).references(() => users.telegramId),
  status: varchar("status", { length: 50 }).default("PENDING").notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  paymentType: varchar("payment_type", { length: 20 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 20 }).default("UNPAID"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  landmarkAddress: text("landmark_address").notNull(),
  courierNotes: text("courier_notes"),
  // Snapshotted at checkout, not just read live off the user profile — the
  // person receiving a delivery isn't always the account holder, and a
  // later profile edit shouldn't rewrite what a past order actually said.
  // Nullable only because orders placed before this field existed have none.
  customerName: varchar("customer_name", { length: 200 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  riskLevel: varchar("risk_level", { length: 10 }), // LOW | MEDIUM | HIGH | null — Phase 2
  // Phase 2 — courier delivery-proof flow. Code is generated when an order
  // becomes READY_FOR_DELIVERY for CASH orders; courier must have the
  // customer read it back on arrival before cash collection is confirmed.
  cashConfirmationCode: varchar("cash_confirmation_code", { length: 2 }),
  deliveryProofPhotoUrl: text("delivery_proof_photo_url"),
  // When the courier bot successfully sent the dispatch card for this order.
  // NULL on a READY_FOR_DELIVERY order means the courier hasn't been told
  // yet — the bot's backfill loop uses this to re-deliver dispatches that
  // were lost while it was down (the WS event is only the fast path).
  courierNotifiedAt: timestamp("courier_notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id),
  selectedVariant: varchar("selected_variant", { length: 50 }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
});

export const orderLogs = pgTable("order_logs", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }),
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }),
  changedBy: varchar("changed_by", { length: 50 }), // SYSTEM | KITCHEN | COURIER | USER
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
});

// Not in the original blueprint's SQL — added to back docs/auth-contract.md #2
// (Android KDS device authentication). One row per physical kitchen tablet.
export const deviceKeys = pgTable("device_keys", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 100 }).notNull(), // e.g. "kitchen-tablet-1"
  apiKey: varchar("api_key", { length: 128 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
