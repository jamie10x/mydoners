import { useEffect, useRef, useState } from "react";
import type { Order, OrderStatus, Product } from "@mydoners/shared-contracts";
import { api, ApiError } from "../api/client";
import { useUiStore } from "../store/uiStore";
import { useCartStore } from "../store/cartStore";
import { useRealtimeOrder } from "../hooks/useRealtimeOrder";
import { ErrorState } from "../components/ErrorState";
import { Confetti } from "../components/Confetti";
import { hapticSuccess } from "../lib/haptics";
import { formatSom } from "../lib/format";
import { t, variantLabel } from "../i18n/strings";

const STAGES: Array<{ label: string; statuses: OrderStatus[] }> = [
  { label: t("stageReceived"), statuses: ["PENDING", "CONFIRMED"] },
  { label: t("stageCooking"), statuses: ["COOKING"] },
  { label: t("stageOnTheWay"), statuses: ["READY_FOR_DELIVERY", "ON_THE_WAY"] },
  { label: t("stageDelivered"), statuses: ["DELIVERED"] },
];

function stageIndexFor(status: OrderStatus): number {
  return STAGES.findIndex((stage) => stage.statuses.includes(status));
}

/** Optional self-service verification for MEDIUM-risk orders — doesn't gate cooking, see backend/src/services/orderService.ts. */
function OtpVerification({ orderId }: { orderId: number }) {
  const [step, setStep] = useState<"prompt" | "requested" | "verified">("prompt");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/orders/${orderId}/otp/request`);
      setStep("requested");
    } catch (err) {
      setError(err instanceof ApiError ? err.envelope.message : t("otpSendFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/orders/${orderId}/otp/verify`, { code });
      setStep("verified");
    } catch (err) {
      setError(err instanceof ApiError ? err.envelope.message : t("otpInvalid"));
    } finally {
      setBusy(false);
    }
  }

  if (step === "verified") {
    return <p className="rounded-xl bg-green-50 p-3 text-sm font-medium text-green-700">{t("otpVerified")}</p>;
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="mb-2 text-sm font-semibold text-amber-800">{t("otpTitle")}</p>
      {step === "prompt" ? (
        <button
          onClick={requestCode}
          disabled={busy}
          className="w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white"
        >
          {busy ? t("otpSending") : t("otpSend")}
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("otpPlaceholder")}
            className="min-w-0 flex-1 rounded-lg border border-amber-300 px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={verifyCode}
            disabled={busy || code.length < 4}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {t("otpVerify")}
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}

export function OrderTrackingPage() {
  const activeOrderId = useUiStore((s) => s.activeOrderId);
  const goTo = useUiStore((s) => s.goTo);
  const addItem = useCartStore((s) => s.addItem);
  const [order, setOrder] = useState<Order | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "not-found" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [reordering, setReordering] = useState(false);
  // Only celebrate a DELIVERED status reached live during this visit —
  // revisiting an already-delivered order from history (see ProfilePage's
  // order history) must not replay the confetti every time.
  const [celebrate, setCelebrate] = useState(false);
  const prevStatusRef = useRef<OrderStatus | null>(null);
  // useRealtimeOrder starts its internal state from "PENDING" (see its
  // initialStatus param default below, used before `order` has loaded) and
  // only catches up to the real status a render or two later. Without this
  // guard, that catch-up itself reads as a "PENDING → DELIVERED" transition
  // and fires the celebration on every plain history revisit. So: wait
  // until liveStatus has actually caught up to the freshly-loaded order's
  // real status once, and only treat CHANGES after that point as live.
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!activeOrderId) return;
    setLoadState("loading");
    api
      .get<Order>(`/orders/${activeOrderId}`)
      .then((o) => {
        setOrder(o);
        setLoadState("loaded");
      })
      .catch((err) => {
        // Only a definitive 404 means the order is gone — anything else
        // (offline, 5xx) is retryable and must not read as "no order".
        setLoadState(err instanceof ApiError && err.status === 404 ? "not-found" : "error");
      });
  }, [activeOrderId, reloadKey]);

  const { status: liveStatus, connected } = useRealtimeOrder(activeOrderId, order?.status ?? "PENDING");

  useEffect(() => {
    if (!order) return;
    if (!syncedRef.current) {
      // Still catching up to the real fetched status — not a transition yet.
      if (liveStatus !== order.status) return;
      syncedRef.current = true;
      prevStatusRef.current = liveStatus;
      return;
    }
    if (prevStatusRef.current !== "DELIVERED" && liveStatus === "DELIVERED") {
      setCelebrate(true);
      hapticSuccess();
    }
    prevStatusRef.current = liveStatus;
  }, [liveStatus, order]);

  async function reorder() {
    if (!order) return;
    setReordering(true);
    try {
      const res = await api.get<{ items: Product[] }>("/products?pageSize=100");
      const byId = new Map(res.items.map((p) => [p.id, p]));
      for (const line of order.items) {
        const product = byId.get(line.productId);
        if (!product) continue; // discontinued since this order — skip rather than fail the whole reorder
        const variant = line.selectedVariant === "Beef" || line.selectedVariant === "Chicken" ? line.selectedVariant : null;
        addItem(product, variant, line.quantity);
      }
      goTo("cart");
    } catch {
      // Best-effort — the customer stays on the receipt view and can retry.
    } finally {
      setReordering(false);
    }
  }

  if (!activeOrderId || loadState === "not-found") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="py-16 text-center text-sm font-medium text-stone-400">{t("noActiveOrder")}</p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ErrorState
          message={t("orderLoadFailed")}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      </div>
    );
  }

  if (loadState === "loading" || !order) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-6">
        <div className="h-12 w-40 animate-pulse rounded-xl bg-stone-200/60" />
        <div className="h-56 animate-pulse rounded-2xl bg-stone-200/60" />
        <div className="h-32 animate-pulse rounded-2xl bg-stone-200/60" />
      </div>
    );
  }

  if (liveStatus === "CANCELLED") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-4 text-center">
        <p className="text-3xl">😔</p>
        <p className="text-lg font-bold text-red-600">{t("orderCancelled", { id: activeOrderId })}</p>
        <button
          onClick={() => goTo("menu")}
          className="rounded-xl bg-brand px-5 py-2.5 font-semibold text-white shadow-lg shadow-brand/30"
        >
          {t("backToMenu")}
        </button>
      </div>
    );
  }

  if (liveStatus === "DELIVERED") {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col items-center gap-5 overflow-y-auto px-4 pb-10 pt-10 text-center">
        {celebrate && <Confetti />}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-5xl">✅</div>
        <div>
          <p className="text-xl font-extrabold text-stone-900">{t("deliveredTitle")}</p>
          <p className="mt-1 text-sm text-stone-500">{t("deliveredSubtitle")}</p>
        </div>

        <div className="w-full rounded-2xl border border-stone-100 bg-white p-4 text-left shadow-sm">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">{t("receiptTitle")}</h2>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between py-1 text-sm">
              <span className="text-stone-700">
                {item.quantity}× {item.productName}
                {item.selectedVariant ? ` (${variantLabel(item.selectedVariant)})` : ""}
              </span>
              <span className="font-semibold text-stone-900">{formatSom(item.totalPrice)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-stone-100 pt-2 text-sm font-bold text-stone-900">
            <span>{t("receiptTotal")}</span>
            <span>{formatSom(order.totalAmount)}</span>
          </div>
        </div>

        <div className="mt-2 flex w-full flex-col gap-2">
          <button
            onClick={reorder}
            disabled={reordering}
            className="rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 disabled:opacity-60"
          >
            {reordering ? t("reordering") : t("orderAgain")}
          </button>
          <button onClick={() => goTo("menu")} className="text-sm font-semibold text-stone-400 underline">
            {t("doneBackToMenu")}
          </button>
        </div>
      </div>
    );
  }

  const currentStageIndex = stageIndexFor(liveStatus);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pt-6 pb-10">
      <header>
        <h1 className="text-lg font-extrabold text-stone-900">{t("orderNumber", { id: activeOrderId })}</h1>
        <p className="text-sm font-medium text-stone-400">{formatSom(order.totalAmount)}</p>
      </header>

      {!connected && (
        <p className="-mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          {t("reconnecting")}
        </p>
      )}

      <div className="flex flex-col gap-0 rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
        {STAGES.map((stage, index) => {
          const reached = index <= currentStageIndex;
          return (
            <div key={stage.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`h-3 w-3 rounded-full ${reached ? "bg-brand" : "bg-stone-200"}`} />
                {index < STAGES.length - 1 && (
                  <div
                    className={`w-0.5 flex-1 ${index < currentStageIndex ? "bg-brand" : "bg-stone-200"}`}
                    style={{ minHeight: 32 }}
                  />
                )}
              </div>
              <p className={`pb-6 text-sm font-semibold ${reached ? "text-stone-900" : "text-stone-400"}`}>
                {stage.label}
              </p>
            </div>
          );
        })}
      </div>

      {order.riskLevel === "MEDIUM" && <OtpVerification orderId={activeOrderId} />}

      {order.cashConfirmationCode && (liveStatus === "READY_FOR_DELIVERY" || liveStatus === "ON_THE_WAY") && (
        <div className="rounded-xl bg-stone-100 p-3 text-center">
          <p className="text-sm font-medium text-stone-500">{t("cashCodeHint")}</p>
          <p className="mt-1 text-3xl font-bold tracking-widest text-stone-900">{order.cashConfirmationCode}</p>
        </div>
      )}

      <div className="rounded-2xl border border-stone-100 bg-white p-3 shadow-sm">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">{t("itemsTitle")}</h2>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between py-1 text-sm">
            <span className="text-stone-700">
              {item.quantity}× {item.productName}
              {item.selectedVariant ? ` (${variantLabel(item.selectedVariant)})` : ""}
            </span>
            <span className="font-semibold text-stone-900">{formatSom(item.totalPrice)}</span>
          </div>
        ))}
      </div>

      <button onClick={() => goTo("menu")} className="text-sm font-semibold text-stone-400 underline">
        {t("orderSomethingElse")}
      </button>
    </div>
  );
}
