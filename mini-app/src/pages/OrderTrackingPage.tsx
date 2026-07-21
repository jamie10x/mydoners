import { useEffect, useState } from "react";
import type { Order, OrderStatus } from "@mydoners/shared-contracts";
import { api, ApiError } from "../api/client";
import { useUiStore } from "../store/uiStore";
import { useRealtimeOrder } from "../hooks/useRealtimeOrder";
import { formatSom } from "../lib/format";

const STAGES: Array<{ label: string; statuses: OrderStatus[] }> = [
  { label: "Order received", statuses: ["PENDING", "CONFIRMED"] },
  { label: "Cooking in kitchen", statuses: ["COOKING"] },
  { label: "Out for delivery", statuses: ["READY_FOR_DELIVERY", "ON_THE_WAY"] },
  { label: "Delivered", statuses: ["DELIVERED"] },
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
      setError(err instanceof ApiError ? err.envelope.message : "Couldn't send the code — try again.");
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
      setError(err instanceof ApiError ? err.envelope.message : "Invalid or expired code.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "verified") {
    return <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">✅ Order verified via SMS.</p>;
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="mb-2 text-sm font-medium text-amber-800">Verify this order via SMS (optional)</p>
      {step === "prompt" ? (
        <button
          onClick={requestCode}
          disabled={busy}
          className="w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white"
        >
          {busy ? "Sending…" : "Send code"}
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            className="min-w-0 flex-1 rounded-lg border border-amber-300 px-3 py-2 text-sm"
          />
          <button
            onClick={verifyCode}
            disabled={busy || code.length < 4}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Verify
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function OrderTrackingPage() {
  const activeOrderId = useUiStore((s) => s.activeOrderId);
  const goTo = useUiStore((s) => s.goTo);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!activeOrderId) return;
    api.get<Order>(`/orders/${activeOrderId}`).then(setOrder);
  }, [activeOrderId]);

  const liveStatus = useRealtimeOrder(activeOrderId, order?.status ?? "PENDING");

  if (!activeOrderId || !order) {
    return <p className="py-16 text-center text-black/40">No active order.</p>;
  }

  if (liveStatus === "CANCELLED") {
    return (
      <div className="flex flex-col items-center gap-4 px-4 pt-16 text-center">
        <p className="text-lg font-bold text-red-600">Order #{activeOrderId} was cancelled</p>
        <button onClick={() => goTo("menu")} className="rounded-xl bg-brand px-5 py-2.5 font-semibold text-white">
          Back to menu
        </button>
      </div>
    );
  }

  const currentStageIndex = stageIndexFor(liveStatus);

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-10">
      <header>
        <h1 className="text-lg font-bold">Order #{activeOrderId}</h1>
        <p className="text-sm text-black/50">{formatSom(order.totalAmount)}</p>
      </header>

      <div className="flex flex-col gap-0">
        {STAGES.map((stage, index) => {
          const reached = index <= currentStageIndex;
          return (
            <div key={stage.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`h-3 w-3 rounded-full ${reached ? "bg-brand" : "bg-black/15"}`} />
                {index < STAGES.length - 1 && (
                  <div className={`w-0.5 flex-1 ${index < currentStageIndex ? "bg-brand" : "bg-black/15"}`} style={{ minHeight: 32 }} />
                )}
              </div>
              <p className={`pb-6 text-sm font-medium ${reached ? "text-black" : "text-black/40"}`}>{stage.label}</p>
            </div>
          );
        })}
      </div>

      {order.riskLevel === "MEDIUM" && <OtpVerification orderId={activeOrderId} />}

      {order.cashConfirmationCode && (liveStatus === "READY_FOR_DELIVERY" || liveStatus === "ON_THE_WAY") && (
        <div className="rounded-xl bg-black/5 p-3 text-center">
          <p className="text-sm text-black/60">Give this code to your courier to confirm cash payment</p>
          <p className="mt-1 text-3xl font-bold tracking-widest">{order.cashConfirmationCode}</p>
        </div>
      )}

      <div className="rounded-xl border border-black/5 bg-white p-3">
        <h2 className="mb-2 text-sm font-semibold text-black/50">Items</h2>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>
              {item.quantity}× {item.productName}
              {item.selectedVariant ? ` (${item.selectedVariant})` : ""}
            </span>
            <span>{formatSom(item.totalPrice)}</span>
          </div>
        ))}
      </div>

      <button onClick={() => goTo("menu")} className="text-sm text-black/50 underline">
        Order something else
      </button>
    </div>
  );
}
