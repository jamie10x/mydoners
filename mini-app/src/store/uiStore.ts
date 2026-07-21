import { create } from "zustand";

// A single-flow ordering app (menu -> cart -> checkout -> tracking) doesn't
// need a full router — a small screen-state machine is simpler and avoids
// pulling in react-router-dom for four linear screens.
export type Screen = "menu" | "cart" | "checkout" | "tracking";

interface UiState {
  screen: Screen;
  activeOrderId: number | null;
  goTo: (screen: Screen) => void;
  setActiveOrder: (orderId: number) => void;
}

export const useUiStore = create<UiState>((set) => ({
  screen: "menu",
  activeOrderId: null,
  goTo: (screen) => set({ screen }),
  setActiveOrder: (orderId) => set({ activeOrderId: orderId, screen: "tracking" }),
}));
