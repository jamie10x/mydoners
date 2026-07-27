import { create } from "zustand";
import { persist } from "zustand/middleware";

// A single-flow ordering app (menu -> cart -> checkout -> tracking) doesn't
// need a full router — a small screen-state machine is simpler and avoids
// pulling in react-router-dom for four linear screens.
export type Screen = "menu" | "cart" | "checkout" | "tracking" | "profile";

interface UiState {
  // Persisted, so reopening the app restores wherever the customer left off
  // (mid-checkout, browsing the cart, etc.) instead of always resetting to
  // the menu. useResumeActiveOrder still takes priority over this on load —
  // an active, undelivered order always wins and jumps to "tracking".
  screen: Screen;
  activeOrderId: number | null;
  goTo: (screen: Screen) => void;
  setActiveOrder: (orderId: number) => void;
  clearActiveOrder: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      screen: "menu",
      activeOrderId: null,
      goTo: (screen) => set({ screen }),
      setActiveOrder: (orderId) => set({ activeOrderId: orderId, screen: "tracking" }),
      clearActiveOrder: () => set({ activeOrderId: null }),
    }),
    {
      name: "mydoners-active-order",
      partialize: (state) => ({ activeOrderId: state.activeOrderId, screen: state.screen }),
    },
  ),
);
