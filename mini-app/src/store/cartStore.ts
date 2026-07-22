import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@mydoners/shared-contracts";

export interface CartLine {
  product: Product;
  selectedVariant: "Beef" | "Chicken" | null;
  quantity: number;
}

function lineKey(productId: number, variant: string | null) {
  return `${productId}:${variant ?? ""}`;
}

function unitPriceFor(product: Product, variant: "Beef" | "Chicken" | null): number {
  if (product.hasMeatChoice) {
    return Number(variant === "Beef" ? product.beefPrice : product.chickenPrice);
  }
  return Number(product.basePrice);
}

// Telegram can tear down and recreate the Mini App's WebView between opens
// (it's not guaranteed to keep JS state alive in the background), so the
// cart is persisted to localStorage to survive that — otherwise picking a
// meal, getting interrupted, and reopening the app would silently lose it.
// Capped at 24h: matches the Mini App's own re-auth window (initData is only
// valid ~24h, see backend/src/middleware/auth.ts), and stale menu prices /
// sold-out items become more likely to have drifted past that point anyway.
export const CART_TTL_MS = 24 * 60 * 60 * 1000;

interface CartState {
  lines: Record<string, CartLine>;
  savedAt: number;
  addItem: (product: Product, variant: "Beef" | "Chicken" | null, quantity?: number) => void;
  removeLine: (productId: number, variant: string | null) => void;
  setQuantity: (productId: number, variant: string | null, quantity: number) => void;
  clear: () => void;
  totalAmount: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: {},
      savedAt: Date.now(),

      addItem: (product, variant, quantity = 1) =>
        set((state) => {
          const key = lineKey(product.id, variant);
          const existing = state.lines[key];
          return {
            lines: {
              ...state.lines,
              [key]: {
                product,
                selectedVariant: variant,
                quantity: (existing?.quantity ?? 0) + quantity,
              },
            },
            savedAt: Date.now(),
          };
        }),

      removeLine: (productId, variant) =>
        set((state) => {
          const { [lineKey(productId, variant)]: _removed, ...rest } = state.lines;
          return { lines: rest, savedAt: Date.now() };
        }),

      setQuantity: (productId, variant, quantity) =>
        set((state) => {
          const key = lineKey(productId, variant);
          const existing = state.lines[key];
          if (!existing) return state;
          if (quantity <= 0) {
            const { [key]: _removed, ...rest } = state.lines;
            return { lines: rest, savedAt: Date.now() };
          }
          return { lines: { ...state.lines, [key]: { ...existing, quantity } }, savedAt: Date.now() };
        }),

      clear: () => set({ lines: {}, savedAt: Date.now() }),

      totalAmount: () =>
        Object.values(get().lines).reduce(
          (sum, line) => sum + unitPriceFor(line.product, line.selectedVariant) * line.quantity,
          0,
        ),

      itemCount: () => Object.values(get().lines).reduce((sum, line) => sum + line.quantity, 0),
    }),
    {
      name: "mydoners-cart",
      onRehydrateStorage: () => (state) => {
        if (state && Date.now() - state.savedAt > CART_TTL_MS) {
          state.lines = {};
          state.savedAt = Date.now();
        }
      },
    },
  ),
);

export { unitPriceFor };
