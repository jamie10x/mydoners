import { useEffect, useRef } from "react";
import type { Order } from "@mydoners/shared-contracts";
import { api, ApiError } from "../api/client";
import { useUiStore } from "../store/uiStore";
import { isDeepLinkedOrder } from "../lib/deepLink";

const TERMINAL_STATUSES: Order["status"][] = ["DELIVERED", "CANCELLED"];

/**
 * Runs once per app load: if a previous session left an order in progress
 * (see uiStore's persisted activeOrderId), checks whether it's actually
 * still active and jumps straight to the tracking screen if so — otherwise
 * clears it. Without this, closing the app mid-delivery and reopening it
 * drops you back on the menu with no way back to that order.
 */
export function useResumeActiveOrder(authReady: boolean) {
  const activeOrderId = useUiStore((s) => s.activeOrderId);
  const goTo = useUiStore((s) => s.goTo);
  const clearActiveOrder = useUiStore((s) => s.clearActiveOrder);
  const checked = useRef(false);

  useEffect(() => {
    // Waits for auth so this can't fire an unauthenticated request that
    // 401s and gets misread as "that order doesn't exist anymore".
    if (checked.current || !authReady || !activeOrderId) return;
    checked.current = true;

    // Opened from an order link — the customer asked for this specific order,
    // so show it even if it's finished (receipt, proof photo, rating). The
    // tracking page fetches it itself, so there's nothing to validate here.
    if (isDeepLinkedOrder()) {
      goTo("tracking");
      return;
    }

    api
      .get<Order>(`/orders/${activeOrderId}`)
      .then((order) => {
        if (TERMINAL_STATUSES.includes(order.status)) {
          clearActiveOrder();
        } else {
          goTo("tracking");
        }
      })
      .catch((err) => {
        // Forget the order only when the server definitively says it's gone
        // (404). A launch-time network blip must not erase a live delivery —
        // jump to tracking anyway; that screen has its own retry UI.
        if (err instanceof ApiError && err.status === 404) {
          clearActiveOrder();
        } else {
          goTo("tracking");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, activeOrderId]);
}
