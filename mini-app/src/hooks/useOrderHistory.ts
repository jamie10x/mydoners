import { useCallback, useEffect, useState } from "react";
import type { Order } from "@mydoners/shared-contracts";
import { api } from "../api/client";

export function useOrderHistory(telegramId: number | undefined) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const reload = useCallback(() => {
    if (!telegramId) return;
    setLoading(true);
    setLoadFailed(false);
    api
      .get<Order[]>("/orders/mine?limit=20")
      .then(setOrders)
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, [telegramId]);

  useEffect(reload, [reload]);

  return { orders, loading, loadFailed, reload };
}
