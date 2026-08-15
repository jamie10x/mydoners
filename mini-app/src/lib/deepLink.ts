import { useUiStore } from "../store/uiStore";

/**
 * Adopts an order id passed in the launch URL (`?order=123`).
 *
 * Every status notification's "Buyurtmani kuzatish" button carries the order
 * it's about, so tapping it should land on that order rather than the menu.
 * Called once before React renders, so `activeOrderId` is already correct on
 * the first paint and useResumeActiveOrder validates it as it would any
 * persisted order — no separate code path for deep links.
 */
let arrivedViaDeepLink = false;

/**
 * True when this session was opened from an order link.
 *
 * useResumeActiveOrder normally forgets a finished order on launch, which is
 * right for a persisted one but wrong here: the customer just tapped "track
 * this order" on a message about it, and a delivered order still has a
 * receipt, a proof photo, and a rating prompt worth showing.
 */
export function isDeepLinkedOrder(): boolean {
  return arrivedViaDeepLink;
}

export function applyOrderDeepLink(): void {
  const raw = new URLSearchParams(window.location.search).get("order");
  const orderId = Number(raw);
  if (!raw || !Number.isInteger(orderId) || orderId <= 0) return;

  arrivedViaDeepLink = true;
  useUiStore.getState().setActiveOrder(orderId);

  // Drop the param so a later reload doesn't yank the customer back to this
  // order after they've navigated elsewhere.
  const url = new URL(window.location.href);
  url.searchParams.delete("order");
  window.history.replaceState({}, "", url.toString());
}
