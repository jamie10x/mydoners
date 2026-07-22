import { useEffect, useRef } from "react";
import type { Order } from "@mydoners/shared-contracts";
import { api } from "../api/client";
import { useUiStore } from "../store/uiStore";

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

    api
      .get<Order>(`/orders/${activeOrderId}`)
      .then((order) => {
        if (TERMINAL_STATUSES.includes(order.status)) {
          clearActiveOrder();
        } else {
          goTo("tracking");
        }
      })
      .catch(() => clearActiveOrder());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, activeOrderId]);
}
