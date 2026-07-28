// Mirrors docs/openapi.yaml component schemas and docs/websocket-events.md payloads.
// Keep these in sync by hand — see docs/decisions.md #8 for why this isn't codegen'd.

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COOKING"
  | "READY_FOR_DELIVERY"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentType = "CASH" | "CLICK" | "PAYME";
export type PaymentStatus = "UNPAID" | "PAID";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | null;
export type ChangedBy = "SYSTEM" | "KITCHEN" | "COURIER" | "USER";

export interface ErrorEnvelope {
  code:
    | "VALIDATION_ERROR"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "COD_BLOCKED"
    | "SERVER_ERROR";
  message: string;
  details?: Record<string, unknown>;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  selectedVariant: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: number;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  latitude: number;
  longitude: number;
  landmarkAddress: string;
  courierNotes: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerTelegramUsername: string | null;
  addressLabel: string | null;
  riskLevel: RiskLevel;
  cashConfirmationCode: string | null;
  deliveryProofPhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// Backs KDS's lightweight "Today's Sales" screen and the admin dashboard's
// per-period summary card — see backend/src/services/orderService.ts.
export interface SalesSummary {
  orderCount: number;
  revenue: number;
  topItems: Array<{ productName: string; quantity: number }>;
}

// WebSocket envelope + event data shapes — see docs/websocket-events.md
export interface RealtimeEvent<T> {
  event: string;
  orderId: number;
  timestamp: string;
  data: T;
}

export interface OrderStatusChangedData {
  status: OrderStatus;
  previousStatus: string;
  changedBy: ChangedBy;
}

export interface OrderRiskFlaggedData {
  riskLevel: Exclude<RiskLevel, "LOW" | null>;
  reason: "FIRST_ORDER_HIGH_VALUE" | "REPEAT_CANCELLATIONS";
  action: "OTP_REQUIRED" | "VERBAL_CONFIRMATION_REQUIRED" | "COD_BLOCKED";
}

export type RiskReason = "TRUSTED_CUSTOMER" | "FIRST_ORDER_HIGH_VALUE" | "REPEAT_CANCELLATIONS" | "LOW_VALUE_ORDER";
export type RiskAction = "NONE" | "OTP_REQUIRED" | "VERBAL_CONFIRMATION_REQUIRED" | "COD_BLOCKED";

export interface RiskAssessment {
  riskLevel: RiskLevel;
  reason: RiskReason;
  action: RiskAction;
}

export interface OrderCreatedData {
  status: "PENDING" | "CONFIRMED";
  customerName: string;
  items: Array<{
    productName: string;
    selectedVariant: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  landmarkAddress: string;
  courierNotes: string | null;
  riskLevel: RiskLevel;
}

export interface OrderCancelledData {
  cancelledBy: ChangedBy;
  reason: string | null;
}

export interface CourierAssignedData {
  customerName: string;
  customerPhone: string | null;
  latitude: number;
  longitude: number;
  landmarkAddress: string;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  amountToCollect: number;
  courierNotes: string | null;
}

export interface DeliveryConfirmedData {
  deliveredAt: string;
  proofPhotoUrl: string | null;
}

export interface SavedAddress {
  id: number;
  label: string;
  latitude: number;
  longitude: number;
  landmarkAddress: string;
}

export interface PublicUser {
  telegramId: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  phoneNumber: string | null;
  isPhoneVerified: boolean;
  completedOrdersCount: number;
  isBlacklisted: boolean;
  // True once name, phone, and at least one saved address all exist — lets
  // the Mini App show a "finish your profile" nudge instead of guessing.
  isProfileComplete: boolean;
}

export interface Category {
  id: number;
  name: string;
  displayOrder: number;
}

export interface Product {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  basePrice: number | string;
  hasMeatChoice: boolean;
  beefPrice: number | string | null;
  chickenPrice: number | string | null;
  isAvailable: boolean;
  imageUrl: string | null;
}
