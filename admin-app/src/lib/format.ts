import type { OrderStatus } from "@mydoners/shared-contracts";

export const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-stone-200 text-stone-600",
  CONFIRMED: "bg-blue-100 text-blue-700",
  COOKING: "bg-amber-100 text-amber-700",
  READY_FOR_DELIVERY: "bg-amber-100 text-amber-700",
  ON_THE_WAY: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Kutilmoqda",
  CONFIRMED: "Qabul qilindi",
  COOKING: "Tayyorlanmoqda",
  READY_FOR_DELIVERY: "Yetkazishga tayyor",
  ON_THE_WAY: "Yetkazilmoqda",
  DELIVERED: "Yetkazildi",
  CANCELLED: "Bekor qilindi",
};

// Space-grouped digits + "so'm" — matches mini-app's src/lib/format.ts, the way
// prices are written locally (not en-US commas + "UZS").
export function formatSom(amount: number | null): string {
  if (amount === null) return "—";
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped} so'm`;
}

// Numeric, no locale dependency — avoids leaking English month names ("Jul 28")
// the way Intl's "en-US" formatting would.
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatFullDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** "Hech qachon" / "Bugun" / "3 kun oldin" — for a customer's last-order column. */
export function formatRelativeDays(iso: string | null): string {
  if (!iso) return "Hech qachon";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Bugun";
  if (days === 1) return "Kecha";
  return `${days} kun oldin`;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Builds a query string, dropping undefined/empty values. */
export function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  return search.toString();
}
