import { create } from "zustand";
import type { PublicUser } from "@mydoners/shared-contracts";

interface AuthState {
  token: string | null;
  user: PublicUser | null;
  setSession: (token: string, user: PublicUser) => void;
  updateUser: (patch: Partial<PublicUser>) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setSession: (token, user) => set({ token, user }),
  updateUser: (patch) => set((state) => (state.user ? { user: { ...state.user, ...patch } } : state)),
  clearSession: () => set({ token: null, user: null }),
}));
