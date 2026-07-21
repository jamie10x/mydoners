import type { RiskAssessment } from "@mydoners/shared-contracts";

const HIGH_VALUE_THRESHOLD_UZS = 100_000;
const TRUSTED_COMPLETED_ORDERS = 2;
const BLACKLIST_CANCELLATION_THRESHOLD = 2;

interface RiskInput {
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  isBlacklisted: boolean;
  isPhoneVerified: boolean;
  orderTotalAmount: number;
}

/**
 * Implements the three-tier CoD risk model from the blueprint. Only meaningful
 * for Cash on Delivery orders — Click/Payme orders are prepaid and carry no
 * CoD risk, so callers should skip scoring entirely for those (see
 * orderService.createOrder).
 */
export function scoreOrderRisk(input: RiskInput): RiskAssessment {
  if (input.isBlacklisted || input.cancelledOrdersCount >= BLACKLIST_CANCELLATION_THRESHOLD) {
    return { riskLevel: "HIGH", reason: "REPEAT_CANCELLATIONS", action: "COD_BLOCKED" };
  }

  if (input.completedOrdersCount >= TRUSTED_COMPLETED_ORDERS) {
    return { riskLevel: "LOW", reason: "TRUSTED_CUSTOMER", action: "NONE" };
  }

  if (input.completedOrdersCount === 0 && input.orderTotalAmount > HIGH_VALUE_THRESHOLD_UZS) {
    // A verified phone number is itself a trust signal that lowers the bar —
    // still flagged MEDIUM (first-time customer), but the KDS badge is the
    // primary path rather than also demanding OTP on top of a already-verified number.
    return {
      riskLevel: "MEDIUM",
      reason: "FIRST_ORDER_HIGH_VALUE",
      action: input.isPhoneVerified ? "VERBAL_CONFIRMATION_REQUIRED" : "OTP_REQUIRED",
    };
  }

  return { riskLevel: "LOW", reason: "LOW_VALUE_ORDER", action: "NONE" };
}
