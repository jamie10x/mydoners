import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Order, OrderStatus, SalesSummary } from "@mydoners/shared-contracts";

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COOKING",
  "READY_FOR_DELIVERY",
  "ON_THE_WAY",
  "DELIVERED",
  "CANCELLED",
];

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-stone-200 text-stone-600",
  CONFIRMED: "bg-blue-100 text-blue-700",
  COOKING: "bg-amber-100 text-amber-700",
  READY_FOR_DELIVERY: "bg-amber-100 text-amber-700",
  ON_THE_WAY: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Kutilmoqda",
  CONFIRMED: "Qabul qilindi",
  COOKING: "Tayyorlanmoqda",
  READY_FOR_DELIVERY: "Yetkazishga tayyor",
  ON_THE_WAY: "Yetkazilmoqda",
  DELIVERED: "Yetkazildi",
  CANCELLED: "Bekor qilindi",
};

// Space-grouped digits + "so'm" — matches mini-app's src/lib/format.ts,
// the way prices are written locally (not en-US commas + "UZS").
function formatSom(amount: number): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped} so'm`;
}

// Numeric, no locale dependency — avoids leaking English month names
// ("Jul 28") the way Intl's "en-US" formatting would.
function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return isoDate(d);
}

export function DashboardPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(isoDate(new Date()));
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");

  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ from, to });
    const orderParams = new URLSearchParams(params);
    if (statusFilter !== "ALL") orderParams.set("status", statusFilter);

    Promise.all([
      api.get<SalesSummary>(`/admin/analytics?${params}`),
      api.get<{ total: number; orders: Order[] }>(`/admin/orders?${orderParams}`),
    ])
      .then(([summaryRes, ordersRes]) => {
        setSummary(summaryRes);
        setOrders(ordersRes.orders);
        setTotal(ordersRes.total);
      })
      .catch(() => setError("Ma'lumotlarni yuklab bo'lmadi"))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [from, to, statusFilter]);

  const avgOrderValue = summary && summary.orderCount > 0 ? summary.revenue / summary.orderCount : 0;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-400">Dan</label>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-base outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-400">Gacha</label>
            <input
              type="date"
              value={to}
              min={from}
              max={isoDate(new Date())}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-base outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-400">Holat</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "ALL")}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-base outline-none focus:border-brand"
            >
              <option value="ALL">Barcha holatlar</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-stone-200/60" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Tushum" value={formatSom(summary?.revenue ?? 0)} />
            <StatCard label="Buyurtmalar" value={String(summary?.orderCount ?? 0)} />
            <StatCard label="O'rtacha buyurtma qiymati" value={formatSom(avgOrderValue)} />
          </div>

          <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-stone-400">Top mahsulotlar</h3>
            {summary && summary.topItems.length > 0 ? (
              <div className="flex flex-col gap-2">
                {summary.topItems.map((item, i) => (
                  <div key={item.productName} className="flex items-center gap-3">
                    <span className="w-5 text-sm font-bold text-stone-300">{i + 1}</span>
                    <span className="flex-1 text-sm font-semibold text-stone-900">{item.productName}</span>
                    <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand">
                      {item.quantity} ta sotildi
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400">Bu davrda hali buyurtma yo'q.</p>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-100 text-left text-xs font-bold uppercase tracking-wide text-stone-400">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Sana</th>
                  <th className="px-4 py-3">Mijoz</th>
                  <th className="px-4 py-3">Mahsulotlar</th>
                  <th className="px-4 py-3">Jami</th>
                  <th className="px-4 py-3">Holat</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                    <td className="px-4 py-2.5 font-bold text-stone-900">#{order.id}</td>
                    <td className="px-4 py-2.5 text-stone-500">{formatShortDate(order.createdAt)}</td>
                    <td className="px-4 py-2.5 text-stone-700">{order.customerName ?? "—"}</td>
                    <td className="px-4 py-2.5 text-stone-500">
                      {order.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-stone-900">
                      {formatSom(order.totalAmount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                      Bu davrda buyurtmalar yo'q.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {total > orders.length && (
            <p className="mt-3 text-center text-xs text-stone-400">
              {total} tadan {orders.length} tasi ko'rsatilmoqda — ko'proq tafsilot uchun sana oralig'i yoki holatni torayting.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-stone-400">{label}</p>
      <p className="text-2xl font-extrabold text-stone-900">{value}</p>
    </div>
  );
}
