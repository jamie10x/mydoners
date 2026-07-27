import { useEffect, useState } from "react";
import type { Order, OrderStatus } from "@mydoners/shared-contracts";
import { api, ApiError } from "../api/client";
import { useUiStore } from "../store/uiStore";
import { useRealtimeOrder } from "../hooks/useRealtimeOrder";
import { ErrorState } from "../components/ErrorState";
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
  const [order, setOrder] = useState<Order | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "not-found" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);

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

  const liveStatus = useRealtimeOrder(activeOrderId, order?.status ?? "PENDING");

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

  const currentStageIndex = stageIndexFor(liveStatus);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pt-6 pb-10">
      <header>
        <h1 className="text-lg font-extrabold text-stone-900">{t("orderNumber", { id: activeOrderId })}</h1>
        <p className="text-sm font-medium text-stone-400">{formatSom(order.totalAmount)}</p>
      </header>

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
