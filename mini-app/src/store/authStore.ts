import { create } from "zustand";
import type { PublicUser } from "@mydoners/shared-contracts";

interface AuthState {
  token: string | null;
  user: PublicUser | null;
  setSession: (token: string, user: PublicUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setSession: (token, user) => set({ token, user }),
  clearSession: () => set({ token: null, user: null }),
}));
