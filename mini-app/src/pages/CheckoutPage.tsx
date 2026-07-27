import { lazy, Suspense, useEffect, useState } from "react";
import type { Order, PaymentType } from "@mydoners/shared-contracts";
import { api, ApiError } from "../api/client";
import { useCartStore } from "../store/cartStore";
import { useUiStore } from "../store/uiStore";
import { useAuthStore } from "../store/authStore";
import { useCheckoutStore } from "../store/checkoutStore";
import { usePhoneVerification } from "../hooks/usePhoneVerification";
import { useTelegramLocationFallback } from "../hooks/useTelegramLocationFallback";
import { useSavedAddresses } from "../hooks/useSavedAddresses";
import type { Coords, GeoStatus } from "../components/MapPicker";
import { formatSom } from "../lib/format";
import { normalizeUzPhone } from "../lib/phone";

// Keep in sync with customer-bot/src/business.ts — used when cash payment is
// blocked and there's no online method to fall back to.
const RESTAURANT_PHONE = "+998 88 422 33 22";

// MapLibre GL JS is ~330KB gzipped — code-split so it's not part of the
// initial Menu bundle, only fetched once someone actually reaches checkout.
const MapPicker = lazy(() => import("../components/MapPicker").then((m) => ({ default: m.MapPicker })));
const MapPickerFallback = () => <div className="h-48 animate-pulse rounded-2xl bg-stone-200/60" />;

const PAYMENT_OPTIONS: Array<{ value: PaymentType; label: string; icon: string; comingSoon?: boolean }> = [
  { value: "CASH", label: "Cash on Delivery", icon: "💵" },
  { value: "CLICK", label: "Click", icon: "🔵", comingSoon: true },
  { value: "PAYME", label: "Payme", icon: "🟢", comingSoon: true },
];

const ADDRESS_ICONS: Record<string, string> = { Home: "🏠", Work: "🏢" };

export function CheckoutPage() {
  const linesByKey = useCartStore((s) => s.lines);
  const lines = Object.values(linesByKey);
  const totalAmount = useCartStore((s) => s.totalAmount());
  const clearCart = useCartStore((s) => s.clear);
  const goTo = useUiStore((s) => s.goTo);
  const setActiveOrder = useUiStore((s) => s.setActiveOrder);

  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codBlocked, setCodBlocked] = useState(false);
  const [savingLabel, setSavingLabel] = useState<string | null>(null); // non-null while the label input is open
  const [saving, setSaving] = useState(false);
  // Set right after a successful submit — drives the brief full-screen
  // confirmation before jumping to tracking.
  const [placedOrderId, setPlacedOrderId] = useState<number | null>(null);

  const user = useAuthStore((s) => s.user);
  const phoneVerification = usePhoneVerification();
  const telegramLocation = useTelegramLocationFallback(user?.telegramId);
  const savedAddresses = useSavedAddresses(user?.telegramId);

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

  const normalizedPhone = normalizeUzPhone(customerPhone);
  const phoneInvalid = customerPhone.trim().length > 0 && normalizedPhone === null;

  const canSubmit =
    coords !== null &&
    landmarkAddress.trim().length > 0 &&
    customerName.trim().length > 0 &&
    normalizedPhone !== null &&
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

  // Telegram-share fallback resumes silently if the app was closed while
  // waiting on it (see checkoutStore's awaitingTelegramLocation).
  useEffect(() => {
    if (awaitingTelegramLocation && telegramLocation.status === "idle") telegramLocation.resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingTelegramLocation]);

  useEffect(() => {
    if (telegramLocation.coords) {
      setCoords(telegramLocation.coords);
      setAwaitingTelegramLocation(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegramLocation.coords]);

  function selectSavedAddress(id: number) {
    const address = savedAddresses.addresses.find((a) => a.id === id);
    if (!address) return;
    setSelectedAddressId(id);
    setCoords({ latitude: address.latitude, longitude: address.longitude });
    setLandmarkAddress(address.landmarkAddress);
  }

  function handleMapChange(next: Coords) {
    setCoords(next);
    setSelectedAddressId(null); // manual adjustment — no longer "exactly" the saved spot
  }

  async function confirmSaveAddress() {
    if (!coords || !savingLabel?.trim()) return;
    setSaving(true);
    try {
      const created = await savedAddresses.create(savingLabel.trim(), coords.latitude, coords.longitude, landmarkAddress.trim());
      if (created) setSelectedAddressId(created.id);
      setSavingLabel(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.envelope.message : "Couldn't save that address — try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePlaceOrder() {
    if (!coords || !normalizedPhone) return;
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
        customerPhone: normalizedPhone,
      });
      clearCart();
      useCheckoutStore.getState().reset();
      // Brief success moment first — the jump to tracking otherwise feels
      // like the tap might not have registered.
      setPlacedOrderId(order.id);
      setTimeout(() => setActiveOrder(order.id), 1800);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.envelope.message);
        // Don't auto-switch payment: the online methods are still "coming
        // soon", so switching would strand the user on a disabled option.
        // The codBlocked banner below explains what to do instead.
        if (err.envelope.code === "COD_BLOCKED") {
          setCodBlocked(true);
        }
      } else {
        setError("Failed to place order. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (placedOrderId !== null) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-20 w-20 animate-[pop_0.35s_ease-out] items-center justify-center rounded-full bg-green-100 text-5xl">
          ✅
        </div>
        <p className="text-xl font-extrabold text-stone-900">Order placed!</p>
        <p className="text-sm font-medium text-stone-500">Order #{placedOrderId} — taking you to tracking…</p>
      </div>
    );
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
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-brand ${
                  phoneInvalid ? "border-red-300" : "border-stone-200"
                }`}
              />
              {phoneInvalid && (
                <p className="text-xs font-medium text-red-600">
                  Enter a valid Uzbek number — e.g. +998 90 123 45 67
                </p>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Delivery location</h2>

            {savedAddresses.addresses.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {savedAddresses.addresses.map((address) => (
                  <button
                    key={address.id}
                    onClick={() => selectSavedAddress(address.id)}
                    className={`rounded-xl border px-3 py-1.5 text-left text-sm font-semibold ${
                      selectedAddressId === address.id
                        ? "border-brand bg-brand/5 text-brand"
                        : "border-stone-200 text-stone-700"
                    }`}
                  >
                    {ADDRESS_ICONS[address.label] ?? "📍"} {address.label}
                  </button>
                ))}
              </div>
            )}

            <Suspense fallback={<MapPickerFallback />}>
              <MapPicker coords={coords} onChange={handleMapChange} onStatusChange={setGeoStatus} />
            </Suspense>

            {coords && !selectedAddressId && landmarkAddress.trim().length > 0 && savedAddresses.addresses.length < 3 && (
              <div className="mt-2">
                {savingLabel === null ? (
                  <button onClick={() => setSavingLabel("")} className="text-xs font-semibold text-brand">
                    📌 Save this address for next time
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={savingLabel}
                      onChange={(e) => setSavingLabel(e.target.value)}
                      placeholder="e.g. Home, Work"
                      autoFocus
                      className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-sm outline-none focus:border-brand"
                    />
                    <button
                      onClick={confirmSaveAddress}
                      disabled={saving || !savingLabel.trim()}
                      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                    >
                      {saving ? "…" : "Save"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {geoStatus === "denied" && !coords && (
              <div className="mt-2 flex flex-col gap-2">
                <div className="rounded-xl bg-red-50 px-3 py-2.5">
                  <p className="text-sm font-medium text-red-700">Location access is blocked — delivery needs it.</p>
                  <p className="mt-1 text-xs text-red-600">
                    Enable location for this app in Telegram Settings → Privacy and Security → Location, or in your
                    browser's site settings, then tap the ⌖ button above again.
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
              <div className="mb-2 rounded-xl bg-red-50 px-3 py-2.5">
                <p className="text-sm font-medium text-red-700">
                  Cash on Delivery isn't available for this order right now.
                </p>
                <p className="mt-1 text-xs text-red-600">
                  Please call us and we'll sort it out —{" "}
                  <a href={`tel:${RESTAURANT_PHONE.replace(/\s/g, "")}`} className="font-bold underline">
                    {RESTAURANT_PHONE}
                  </a>
                </p>
              </div>
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
