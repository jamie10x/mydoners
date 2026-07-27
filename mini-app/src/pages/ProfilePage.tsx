import { lazy, Suspense, useState } from "react";
import type { PublicUser } from "@mydoners/shared-contracts";
import { api, ApiError } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import { useSavedAddresses } from "../hooks/useSavedAddresses";
import { useOrderHistory } from "../hooks/useOrderHistory";
import type { Coords } from "../components/MapPicker";
import { normalizeUzPhone } from "../lib/phone";
import { formatOrderDate, formatSom } from "../lib/format";
import { t, orderStatusLabel } from "../i18n/strings";

// See CheckoutPage.tsx — same code-splitting reasoning (MapLibre GL JS is
// ~330KB gzipped, no reason to ship it on every screen that isn't the map).
const MapPicker = lazy(() => import("../components/MapPicker").then((m) => ({ default: m.MapPicker })));
const MapPickerFallback = () => <div className="h-48 animate-pulse rounded-2xl bg-stone-200/60" />;

const ADDRESS_ICONS: Record<string, string> = { Home: "🏠", Work: "🏢" };

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const goTo = useUiStore((s) => s.goTo);
  const savedAddresses = useSavedAddresses(user?.telegramId);
  const orderHistory = useOrderHistory(user?.telegramId);
  const setActiveOrder = useUiStore((s) => s.setActiveOrder);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addingAddress, setAddingAddress] = useState(false);
  // Two-tap delete: first tap arms "Confirm?", second tap actually removes.
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<number | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newLandmark, setNewLandmark] = useState("");
  const [newCoords, setNewCoords] = useState<Coords | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);

  if (!user) return null;

  const normalizedPhone = phoneNumber.trim() ? normalizeUzPhone(phoneNumber) : undefined;
  const phoneInvalid = phoneNumber.trim().length > 0 && normalizedPhone === null;

  async function saveProfile() {
    if (!user || phoneInvalid) return;
    setSavingProfile(true);
    setError(null);
    setProfileSaved(false);
    try {
      const res = await api.put<{ user: PublicUser }>(`/users/${user.telegramId}/profile`, {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phoneNumber: normalizedPhone ?? undefined,
      });
      updateUser(res.user);
      setProfileSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.envelope.message : t("profileSaveFailed"));
    } finally {
      setSavingProfile(false);
    }
  }

  async function confirmNewAddress() {
    if (!newCoords || !newLabel.trim() || !newLandmark.trim()) return;
    setSavingAddress(true);
    setError(null);
    try {
      await savedAddresses.create(newLabel.trim(), newCoords.latitude, newCoords.longitude, newLandmark.trim());
      setAddingAddress(false);
      setNewLabel("");
      setNewLandmark("");
      setNewCoords(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.envelope.message : t("saveAddressFailed"));
    } finally {
      setSavingAddress(false);
    }
  }

  const initials = [user.firstName, user.lastName].filter(Boolean).map((n) => n![0]).join("").toUpperCase() || "?";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <header className="flex items-center gap-3 px-4 pt-5">
        <button
          onClick={() => goTo("menu")}
          aria-label={t("navMenu")}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200/70 text-stone-700"
        >
          ←
        </button>
        <h1 className="text-lg font-extrabold text-stone-900">{t("profileTitle")}</h1>
      </header>

      <div className="flex flex-col gap-6 px-4 pt-4 pb-10">
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-lg font-extrabold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-extrabold text-stone-900">
              {[user.firstName, user.lastName].filter(Boolean).join(" ") || t("addYourName")}
            </p>
            {user.username && <p className="truncate font-mono text-xs text-stone-400">@{user.username}</p>}
            {user.isPhoneVerified && <p className="mt-1 text-xs font-semibold text-green-600">{t("verifiedViaTelegram")}</p>}
          </div>
        </div>

        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">{t("yourDetails")}</h2>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <label htmlFor="profile-first-name" className="sr-only">
                {t("firstNamePlaceholder")}
              </label>
              <input
                id="profile-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t("firstNamePlaceholder")}
                className="w-full min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <label htmlFor="profile-last-name" className="sr-only">
                {t("lastNamePlaceholder")}
              </label>
              <input
                id="profile-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t("lastNamePlaceholder")}
                className="w-full min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <label htmlFor="profile-phone" className="sr-only">
              {t("phoneFieldLabel")}
            </label>
            <input
              id="profile-phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+998 90 123 45 67"
              inputMode="tel"
              aria-invalid={phoneInvalid}
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-brand ${
                phoneInvalid ? "border-red-300" : "border-stone-200"
              }`}
            />
            {phoneInvalid && (
              <p className="text-xs font-medium text-red-600">
                {t("phoneInvalid")}
              </p>
            )}
            <button
              onClick={saveProfile}
              disabled={savingProfile || phoneInvalid}
              className="rounded-xl bg-stone-900 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {savingProfile ? t("saving") : t("saveChanges")}
            </button>
            {profileSaved && <p className="text-xs font-semibold text-green-600">{t("profileSaved")}</p>}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wide text-stone-400">{t("savedAddresses")}</h2>
            <span className="text-xs font-medium text-stone-400">{t("addressCount", { count: savedAddresses.addresses.length })}</span>
          </div>

          <div className="flex flex-col gap-2">
            {savedAddresses.loading && (
              <div className="h-14 animate-pulse rounded-xl bg-stone-200/60" />
            )}
            {!savedAddresses.loading && savedAddresses.loadFailed && (
              <button
                onClick={savedAddresses.reload}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-500"
              >
                {t("addressesLoadFailed")}
              </button>
            )}
            {!savedAddresses.loading && savedAddresses.addresses.map((address) => (
              <div
                key={address.id}
                className="flex items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-base">
                  {ADDRESS_ICONS[address.label] ?? "📍"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-stone-900">{address.label}</p>
                  <p className="truncate text-xs text-stone-400">{address.landmarkAddress}</p>
                </div>
                {confirmingRemoveId === address.id ? (
                  <button
                    onClick={() => {
                      setConfirmingRemoveId(null);
                      savedAddresses.remove(address.id).catch(() => setError(t("removeAddressFailed")));
                    }}
                    onBlur={() => setConfirmingRemoveId(null)}
                    className="shrink-0 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    {t("confirmRemove")}
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmingRemoveId(address.id)}
                    className="shrink-0 text-xs font-semibold text-red-600"
                    aria-label={t("removeAddressAria", { label: address.label })}
                  >
                    {t("remove")}
                  </button>
                )}
              </div>
            ))}

            {savedAddresses.addresses.length < 3 &&
              (addingAddress ? (
                <div className="rounded-xl border border-stone-200 p-3">
                  <Suspense fallback={<MapPickerFallback />}>
                    <MapPicker coords={newCoords} onChange={setNewCoords} />
                  </Suspense>
                  <label htmlFor="new-address-label" className="sr-only">
                    {t("addressLabelExample")}
                  </label>
                  <input
                    id="new-address-label"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder={t("addressLabelExample")}
                    className="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                  <label htmlFor="new-address-landmark" className="sr-only">
                    {t("landmarkTitle")}
                  </label>
                  <textarea
                    id="new-address-landmark"
                    value={newLandmark}
                    onChange={(e) => setNewLandmark(e.target.value)}
                    placeholder={t("landmarkTitle")}
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setAddingAddress(false)}
                      className="flex-1 rounded-lg border border-stone-200 py-2 text-sm font-semibold text-stone-600"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      onClick={confirmNewAddress}
                      disabled={savingAddress || !newCoords || !newLabel.trim() || !newLandmark.trim()}
                      className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {savingAddress ? t("saving") : t("saveAddress")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingAddress(true)}
                  className="rounded-xl border border-dashed border-stone-300 py-2.5 text-sm font-semibold text-stone-500"
                >
                  {t("addAddress")}
                </button>
              ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">{t("orderHistory")}</h2>
          <div className="flex flex-col gap-2">
            {orderHistory.loading && (
              <>
                <div className="h-16 animate-pulse rounded-xl bg-stone-200/60" />
                <div className="h-16 animate-pulse rounded-xl bg-stone-200/60" />
              </>
            )}
            {!orderHistory.loading && orderHistory.loadFailed && (
              <button
                onClick={orderHistory.reload}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-stone-500"
              >
                {t("orderHistoryLoadFailed")}
              </button>
            )}
            {!orderHistory.loading && !orderHistory.loadFailed && orderHistory.orders.length === 0 && (
              <p className="py-2 text-sm text-stone-400">{t("orderHistoryEmpty")}</p>
            )}
            {!orderHistory.loading &&
              orderHistory.orders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setActiveOrder(order.id)}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-900">{t("orderNumber", { id: order.id })}</p>
                    <p className="text-xs text-stone-400">{formatOrderDate(order.createdAt)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-stone-900">{formatSom(order.totalAmount)}</p>
                    <p
                      className={`text-xs font-semibold ${
                        order.status === "CANCELLED"
                          ? "text-red-500"
                          : order.status === "DELIVERED"
                            ? "text-green-600"
                            : "text-brand"
                      }`}
                    >
                      {orderStatusLabel(order.status)}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        </section>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      </div>
    </div>
  );
}
