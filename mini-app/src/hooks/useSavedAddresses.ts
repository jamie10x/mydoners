import { useCallback, useEffect, useState } from "react";
import type { SavedAddress } from "@mydoners/shared-contracts";
import { api } from "../api/client";

export function useSavedAddresses(telegramId: number | undefined) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!telegramId) return;
    setLoading(true);
    api
      .get<SavedAddress[]>(`/users/${telegramId}/addresses`)
      .then(setAddresses)
      .finally(() => setLoading(false));
  }, [telegramId]);

  useEffect(reload, [reload]);

  async function create(label: string, latitude: number, longitude: number, landmarkAddress: string) {
    if (!telegramId) return;
    const address = await api.post<SavedAddress>(`/users/${telegramId}/addresses`, {
      label,
      latitude,
      longitude,
      landmarkAddress,
    });
    setAddresses((prev) => [...prev, address]);
    return address;
  }

  async function remove(addressId: number) {
    if (!telegramId) return;
    await api.delete(`/users/${telegramId}/addresses/${addressId}`);
    setAddresses((prev) => prev.filter((a) => a.id !== addressId));
  }

  return { addresses, loading, create, remove, reload };
}
