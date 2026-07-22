import { useEffect, useState } from "react";
import type { Order, PaymentType } from "@mydoners/shared-contracts";
import { api, ApiError } from "../api/client";
import { useCartStore } from "../store/cartStore";
import { useUiStore } from "../store/uiStore";
import { useAuthStore } from "../store/authStore";
import { useCheckoutStore } from "../store/checkoutStore";
import { usePhoneVerification } from "../hooks/usePhoneVerification";
import { useTelegramLocationFallback } from "../hooks/useTelegramLocationFallback";
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

const PAYMENT_OPTIONS: Array<{ value: PaymentType; label: string; icon: string; comingSoon?: boolean }> = [
  { value: "CASH", label: "Cash on Delivery", icon: "💵" },
  { value: "CLICK", label: "Click", icon: "🔵", comingSoon: true },
  { value: "PAYME", label: "Payme", icon: "🟢", comingSoon: true },
];

export function CheckoutPage() {
  const linesByKey = useCartStore((s) => s.lines);
  const lines = Object.values(linesByKey);
  const totalAmount = useCartStore((s) => s.totalAmount());
  const clearCart = useCartStore((s) => s.clear);
  const goTo = useUiStore((s) => s.goTo);
  const setActiveOrder = useUiStore((s) => s.setActiveOrder);

  const { coords: browserCoords, status: geoStatus, request: requestLocation } = useGeolocation();
  const [homeCoords, setHomeCoords] = useState<Coords>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codBlocked, setCodBlocked] = useState(false);
  const [savingHome, setSavingHome] = useState(false);
  const [homeSaved, setHomeSaved] = useState(false);

  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const phoneVerification = usePhoneVerification();
  const telegramLocation = useTelegramLocationFallback(user?.telegramId);

  const customerName = useCheckoutStore((s) => s.customerName);
  const setCustomerName = useCheckoutStore((s) => s.setCustomerName);
  const customerPhone = useCheckoutStore((s) => s.customerPhone);
  const setCustomerPhone = useCheckoutStore((s) => s.setCustomerPhone);
  const landmarkAddress = useCheckoutStore((s) => s.landmarkAddress);
  const setLandmarkAddress = useCheckoutStore((s) => s.setLandmarkAddress);
  const courierNotes = useCheckoutStore((s) => s.courierNotes);
  const setCourierNotes = useCheckoutStore((s) => s.setCourierNotes);
  const paymentType = useCheckoutStore((s) => s.paymentType);
  const setPaymentType = useCheckoutStore((s) => s.setPaymentType);
  const awaitingTelegramLocation = useCheckoutStore((s) => s.awaitingTelegramLocation);
  const setAwaitingTelegramLocation = useCheckoutStore((s) => s.setAwaitingTelegramLocation);

  // Any source works — browser geolocation, the Telegram bot fallback, or a
  // saved home address quick-select.
  const coords = browserCoords ?? telegramLocation.coords ?? homeCoords;
  const usingHome = homeCoords !== null && browserCoords === null && telegramLocation.coords === null;
  const canSubmit =
    coords !== null &&
    landmarkAddress.trim().length > 0 &&
    customerName.trim().length > 0 &&
    customerPhone.trim().length > 0 &&
    !submitting;

  // Prefill from the profile once — never overwrites something already typed
  // (including a value restored from a previous, still-fresh draft).
  useEffect(() => {
    if (!user) return;
    if (!customerName.trim()) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
      if (fullName) setCustomerName(fullName);
    }
    if (!customerPhone.trim() && user.phoneNumber) {
      setCustomerPhone(user.phoneNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.telegramId]);

  // Reopen-resume: if the app was closed while waiting on a Telegram-shared
  // location, check once for it instead of making the customer start over.
  useEffect(() => {
    if (awaitingTelegramLocation && telegramLocation.status === "idle") {
      telegramLocation.resume();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingTelegramLocation]);

  useEffect(() => {
    if (coords) setAwaitingTelegramLocation(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords !== null]);

  function useHomeAddress() {
    if (!user?.homeAddress) return;
    setHomeCoords({ latitude: user.homeAddress.latitude, longitude: user.homeAddress.longitude });
    if (!landmarkAddress.trim()) setLandmarkAddress(user.homeAddress.landmarkAddress);
  }

  async function saveAsHome() {
    if (!coords || !user || !landmarkAddress.trim()) return;
    setSavingHome(true);
    try {
      const res = await api.put<{ user: typeof user }>(`/users/${user.telegramId}/home-address`, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        landmarkAddress: landmarkAddress.trim(),
      });
      updateUser({ homeAddress: res.user.homeAddress });
      setHomeSaved(true);
    } catch {
      // non-critical — the order can still be placed either way
    } finally {
      setSavingHome(false);
    }
  }

  async function handlePlaceOrder() {
    if (!coords) return;
    setSubmitting(true);
    setError(null);
    setCodBlocked(false);
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
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
      });
      clearCart();
      useCheckoutStore.getState().reset();
      setActiveOrder(order.id);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.envelope.message);
        if (err.envelope.code === "COD_BLOCKED") {
          setCodBlocked(true);
          setPaymentType("CLICK");
        }
      } else {
        setError("Failed to place order. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pb-28">
        <header className="flex items-center gap-3 px-4 pt-5">
          <button
            onClick={() => goTo("cart")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200/70 text-stone-700"
          >
            ←
          </button>
          <h1 className="text-lg font-extrabold text-stone-900">Checkout</h1>
        </header>

        <div className="flex flex-col gap-5 px-4 pt-4">
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Your details</h2>
            <div className="flex flex-col gap-2">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                inputMode="tel"
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Delivery location</h2>

            {coords ? (
              <div className="rounded-xl bg-stone-100 px-3 py-2.5">
                <p className="text-sm font-medium text-stone-700">
                  {usingHome ? "🏠 " : "📍 "}
                  {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                  {usingHome && " (Home)"}
                  {telegramLocation.status === "received" && !browserCoords && !usingHome && " (via Telegram)"}
                </p>
                {!usingHome && !homeSaved && user && landmarkAddress.trim().length > 0 && (
                  <button
                    onClick={saveAsHome}
                    disabled={savingHome}
                    className="mt-1.5 text-xs font-semibold text-brand"
                  >
                    {savingHome ? "Saving…" : "📌 Save as Home for next time"}
                  </button>
                )}
                {homeSaved && <p className="mt-1.5 text-xs font-medium text-green-600">✓ Saved as your Home address</p>}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {user?.homeAddress && (
                  <button
                    onClick={useHomeAddress}
                    className="w-full rounded-xl border border-brand/30 bg-brand/5 px-3 py-3 text-left text-sm font-semibold text-brand"
                  >
                    🏠 Use home address
                    <span className="block truncate text-xs font-normal text-brand/70">
                      {user.homeAddress.landmarkAddress}
                    </span>
                  </button>
                )}
                <button
                  onClick={requestLocation}
                  className="w-full rounded-xl border border-dashed border-stone-300 px-3 py-3 text-sm font-semibold text-stone-600"
                >
                  {geoStatus === "locating" ? "Locating…" : "📍 Share my location"}
                </button>
              </div>
            )}

            {geoStatus === "denied" && !coords && (
              <div className="mt-2 flex flex-col gap-2">
                <div className="rounded-xl bg-red-50 px-3 py-2.5">
                  <p className="text-sm font-medium text-red-700">Location access is blocked — delivery needs it.</p>
                  <p className="mt-1 text-xs text-red-600">
                    Enable location for this app in Telegram Settings → Privacy and Security → Location, or in your
                    browser's site settings, then tap "Share my location" again.
                  </p>
                </div>

                {telegramLocation.status === "idle" && (
                  <button
                    onClick={() => {
                      setAwaitingTelegramLocation(true);
                      telegramLocation.start();
                    }}
                    className="w-full rounded-xl border border-brand/30 bg-brand/5 px-3 py-3 text-sm font-semibold text-brand"
                  >
                    📨 Share via Telegram instead
                  </button>
                )}
                {(telegramLocation.status === "requesting" || telegramLocation.status === "waiting") && (
                  <p className="rounded-xl bg-stone-100 px-3 py-2.5 text-sm font-medium text-stone-600">
                    Check Telegram — tap "Share my location" in the message we just sent you. You can close this app
                    and come back once you've shared it.
                  </p>
                )}
                {telegramLocation.status === "error" && (
                  <div>
                    <p className="text-sm font-medium text-red-600">
                      Didn't get it in time — check your Telegram notifications, or try again.
                    </p>
                    <button
                      onClick={() => {
                        setAwaitingTelegramLocation(true);
                        telegramLocation.start();
                      }}
                      className="mt-1 text-sm font-semibold text-brand"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Landmark / apartment</h2>
            <textarea
              value={landmarkAddress}
              onChange={(e) => setLandmarkAddress(e.target.value)}
              placeholder="e.g. Building 5, entrance 2, 3rd floor, apt 14"
              rows={2}
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </section>

          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Notes for courier (optional)</h2>
            <textarea
              value={courierNotes}
              onChange={(e) => setCourierNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </section>

          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Payment</h2>
            {codBlocked && (
              <p className="mb-2 text-sm font-medium text-red-600">
                Cash on Delivery isn't available for this order — pick Click or Payme instead.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {PAYMENT_OPTIONS.map((option) => {
                const disabled = option.comingSoon;
                const selected = paymentType === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => !disabled && setPaymentType(option.value)}
                    disabled={disabled}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold ${
                      disabled
                        ? "border-stone-100 bg-stone-50 text-stone-400"
                        : selected
                          ? "border-brand bg-brand/5 text-stone-900"
                          : "border-stone-200 text-stone-900"
                    } ${codBlocked && option.value === "CASH" ? "opacity-40" : ""}`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      {option.label}
                    </span>
                    {option.comingSoon && (
                      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-stone-500">
                        Coming soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {paymentType === "CASH" && !user?.isPhoneVerified && (
              <div className="mt-3 rounded-xl bg-stone-100 p-3">
                <p className="mb-2 text-sm text-stone-600">
                  Share your Telegram contact to speed up Cash on Delivery verification.
                </p>
                <button
                  onClick={phoneVerification.verify}
                  disabled={phoneVerification.status === "requesting"}
                  className="w-full rounded-lg bg-brand/10 px-3 py-2 text-sm font-semibold text-brand"
                >
                  {phoneVerification.status === "requesting" ? "Waiting for Telegram…" : "📱 Share phone number"}
                </button>
                {phoneVerification.error && (
                  <p className="mt-1 text-sm font-medium text-red-600">{phoneVerification.error}</p>
                )}
              </div>
            )}
          </section>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>
      </div>

      <button
        onClick={handlePlaceOrder}
        disabled={!canSubmit}
        className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl bg-brand px-5 py-3.5 font-semibold text-white shadow-lg shadow-brand/30 disabled:opacity-40"
      >
        <span>{submitting ? "Placing order…" : "Place order"}</span>
        <span>{formatSom(totalAmount)}</span>
      </button>
    </div>
  );
}
