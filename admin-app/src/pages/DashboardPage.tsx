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

function formatSom(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")} UZS`;
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
      .catch(() => setError("Couldn't load dashboard data"))
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
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-400">From</label>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-400">To</label>
            <input
              type="date"
              value={to}
              min={from}
              max={isoDate(new Date())}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-400">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "ALL")}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm outline-none focus:border-brand"
            >
              <option value="ALL">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
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
            <StatCard label="Revenue" value={formatSom(summary?.revenue ?? 0)} />
            <StatCard label="Orders" value={String(summary?.orderCount ?? 0)} />
            <StatCard label="Avg. order value" value={formatSom(avgOrderValue)} />
          </div>

          <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-stone-400">Top products</h3>
            {summary && summary.topItems.length > 0 ? (
              <div className="flex flex-col gap-2">
                {summary.topItems.map((item, i) => (
                  <div key={item.productName} className="flex items-center gap-3">
                    <span className="w-5 text-sm font-bold text-stone-300">{i + 1}</span>
                    <span className="flex-1 text-sm font-semibold text-stone-900">{item.productName}</span>
                    <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand">
                      {item.quantity} sold
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400">No orders in this range yet.</p>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-100 text-left text-xs font-bold uppercase tracking-wide text-stone-400">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Placed</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                    <td className="px-4 py-2.5 font-bold text-stone-900">#{order.id}</td>
                    <td className="px-4 py-2.5 text-stone-500">
                      {new Date(order.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-stone-700">{order.customerName ?? "—"}</td>
                    <td className="px-4 py-2.5 text-stone-500">
                      {order.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-stone-900">
                      {formatSom(order.totalAmount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                      No orders in this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {total > orders.length && (
            <p className="mt-3 text-center text-xs text-stone-400">
              Showing {orders.length} of {total} orders — narrow the date range or status to see more detail.
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
