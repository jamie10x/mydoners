import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PaymentType } from "@mydoners/shared-contracts";

// Same reasoning as cartStore's persistence — see there. Kept in sync with
// CART_TTL_MS conceptually (a checkout draft without a cart is meaningless),
// duplicated as a literal to avoid a cross-store import for one constant.
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

interface CheckoutDraftState {
  customerName: string;
  customerPhone: string;
  landmarkAddress: string;
  courierNotes: string;
  paymentType: PaymentType;
  // Set while waiting on the customer bot to forward a shared Telegram
  // location (see useTelegramLocationFallback) — lets CheckoutPage resume
  // checking for it on reopen instead of the customer needing to press
  // "Share via Telegram instead" all over again.
  awaitingTelegramLocation: boolean;
  savedAt: number;
  setCustomerName: (value: string) => void;
  setCustomerPhone: (value: string) => void;
  setLandmarkAddress: (value: string) => void;
  setCourierNotes: (value: string) => void;
  setPaymentType: (value: PaymentType) => void;
  setAwaitingTelegramLocation: (value: boolean) => void;
  reset: () => void;
}

const initialDraft = {
  customerName: "",
  customerPhone: "",
  landmarkAddress: "",
  courierNotes: "",
  paymentType: "CASH" as PaymentType,
  awaitingTelegramLocation: false,
};

export const useCheckoutStore = create<CheckoutDraftState>()(
  persist(
    (set) => ({
      ...initialDraft,
      savedAt: Date.now(),
      setCustomerName: (value) => set({ customerName: value, savedAt: Date.now() }),
      setCustomerPhone: (value) => set({ customerPhone: value, savedAt: Date.now() }),
      setLandmarkAddress: (value) => set({ landmarkAddress: value, savedAt: Date.now() }),
      setCourierNotes: (value) => set({ courierNotes: value, savedAt: Date.now() }),
      setPaymentType: (value) => set({ paymentType: value, savedAt: Date.now() }),
      setAwaitingTelegramLocation: (value) => set({ awaitingTelegramLocation: value, savedAt: Date.now() }),
      reset: () => set({ ...initialDraft, savedAt: Date.now() }),
    }),
    {
      name: "mydoners-checkout-draft",
      onRehydrateStorage: () => (state) => {
        if (state && Date.now() - state.savedAt > DRAFT_TTL_MS) {
          Object.assign(state, initialDraft, { savedAt: Date.now() });
        }
      },
    },
  ),
);
