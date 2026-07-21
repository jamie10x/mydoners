import { useState } from "react";
import type { Order, PaymentType } from "@mydoners/shared-contracts";
import { api, ApiError } from "../api/client";
import { useCartStore } from "../store/cartStore";
import { useUiStore } from "../store/uiStore";
import { formatSom } from "../lib/format";

type Coords = { latitude: number; longitude: number } | null;

function useGeolocation() {
  const [coords, setCoords] = useState<Coords>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "granted" | "denied">("idle");

  function request() {
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setStatus("granted");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return { coords, status, request };
}

const PAYMENT_OPTIONS: Array<{ value: PaymentType; label: string; available: boolean }> = [
  { value: "CASH", label: "Cash on Delivery", available: true },
  { value: "CLICK", label: "Click", available: false },
  { value: "PAYME", label: "Payme", available: false },
];

export function CheckoutPage() {
  const linesByKey = useCartStore((s) => s.lines);
  const lines = Object.values(linesByKey);
  const totalAmount = useCartStore((s) => s.totalAmount());
  const clearCart = useCartStore((s) => s.clear);
  const goTo = useUiStore((s) => s.goTo);
  const setActiveOrder = useUiStore((s) => s.setActiveOrder);

  const { coords, status: geoStatus, request: requestLocation } = useGeolocation();
  const [landmarkAddress, setLandmarkAddress] = useState("");
  const [courierNotes, setCourierNotes] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = coords !== null && landmarkAddress.trim().length > 0 && !submitting;

  async function handlePlaceOrder() {
    if (!coords) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.post<Order>("/orders", {
        items: lines.map((line) => ({
          productId: line.product.id,
          selectedVariant: line.selectedVariant,
          quantity: line.quantity,
        })),
        paymentType,
        latitude: coords.latitude,
        longitude: coords.longitude,
        landmarkAddress: landmarkAddress.trim(),
        courierNotes: courierNotes.trim() || null,
      });
      clearCart();
      setActiveOrder(order.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.envelope.message : "Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col pb-28">
      <header className="flex items-center gap-3 px-4 pt-4">
        <button onClick={() => goTo("cart")} className="text-lg">
          ←
        </button>
        <h1 className="text-lg font-bold">Checkout</h1>
      </header>

      <div className="flex flex-col gap-5 px-4 pt-4">
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase text-black/50">Delivery location</h2>
          {coords ? (
            <p className="rounded-xl bg-black/5 px-3 py-2 text-sm">
              📍 {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
            </p>
          ) : (
            <button
              onClick={requestLocation}
              className="w-full rounded-xl border border-dashed border-black/20 px-3 py-3 text-sm font-medium text-black/70"
            >
              {geoStatus === "locating" ? "Locating…" : "📍 Share my location"}
            </button>
          )}
          {geoStatus === "denied" && (
            <p className="mt-1 text-sm text-red-600">Location permission denied — required for delivery.</p>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase text-black/50">Landmark / apartment</h2>
          <textarea
            value={landmarkAddress}
            onChange={(e) => setLandmarkAddress(e.target.value)}
            placeholder="e.g. Building 5, entrance 2, 3rd floor, apt 14"
            rows={2}
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase text-black/50">Notes for courier (optional)</h2>
          <textarea
            value={courierNotes}
            onChange={(e) => setCourierNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
          />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase text-black/50">Payment</h2>
          <div className="flex flex-col gap-2">
            {PAYMENT_OPTIONS.map((option) => (
              <button
                key={option.value}
                disabled={!option.available}
                onClick={() => setPaymentType(option.value)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium ${
                  paymentType === option.value ? "border-brand bg-brand/5" : "border-black/10"
                } ${!option.available ? "opacity-40" : ""}`}
              >
                {option.label}
                {!option.available && <span className="text-xs">Coming soon</span>}
              </button>
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <button
        onClick={handlePlaceOrder}
        disabled={!canSubmit}
        className="fixed inset-x-4 bottom-4 flex items-center justify-between rounded-2xl bg-brand px-5 py-3.5 font-semibold text-white shadow-lg disabled:opacity-40"
      >
        <span>{submitting ? "Placing order…" : "Place order"}</span>
        <span>{formatSom(totalAmount)}</span>
      </button>
    </div>
  );
}
