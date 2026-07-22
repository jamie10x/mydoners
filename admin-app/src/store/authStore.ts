import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

// Persisted to localStorage — unlike the customer Mini App (which re-verifies
// fresh Telegram initData on every launch), this is a regular browser session
// for a single admin user, so a normal persisted session makes sense here.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      clearToken: () => set({ token: null }),
    }),
    { name: "mydoners-admin-auth" },
  ),
);
