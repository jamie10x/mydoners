import { create } from "zustand";
import { persist } from "zustand/middleware";

// A single-flow ordering app (menu -> cart -> checkout -> tracking) doesn't
// need a full router — a small screen-state machine is simpler and avoids
// pulling in react-router-dom for four linear screens.
export type Screen = "menu" | "cart" | "checkout" | "tracking";

interface UiState {
  screen: Screen;
  // Persisted (screen itself isn't — see useResumeActiveOrder, which decides
  // on app load whether to jump straight to "tracking" after checking the
  // order isn't already finished). Without this, closing the Mini App right
  // after placing an order and reopening it lands back on the menu with no
  // way back to the order you just placed.
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
      partialize: (state) => ({ activeOrderId: state.activeOrderId }),
    },
  ),
);
