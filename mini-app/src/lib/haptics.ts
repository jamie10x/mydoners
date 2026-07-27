import { hapticFeedbackImpactOccurred, hapticFeedbackNotificationOccurred } from "@telegram-apps/sdk";

// Both calls are already .isAvailable()-gated by the SDK itself, but a plain
// browser tab outside Telegram (dev, or a shared link) has no bridge at all
// — isAvailable() can still throw in that environment rather than just
// returning false, so this stays defensive like the rest of the SDK usage
// in main.tsx/usePhoneVerification.ts.

/** Light tap — add to cart. */
export function hapticTap() {
  try {
    if (hapticFeedbackImpactOccurred.isAvailable()) hapticFeedbackImpactOccurred("light");
  } catch {
    // Not running inside Telegram, or haptics unsupported — no-op.
  }
}

/** Success buzz — order placed, delivered. */
export function hapticSuccess() {
  try {
    if (hapticFeedbackNotificationOccurred.isAvailable()) hapticFeedbackNotificationOccurred("success");
  } catch {
    // Not running inside Telegram, or haptics unsupported — no-op.
  }
}
