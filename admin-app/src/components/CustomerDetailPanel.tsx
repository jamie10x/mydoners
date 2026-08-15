import { useEffect, useState } from "react";
import type { OrderStatus } from "@mydoners/shared-contracts";
import { api } from "../api/client";
import type { AdminUserDetail } from "../api/types";
import { STATUS_LABELS, STATUS_STYLES, formatShortDate, formatSom, formatFullDate } from "../lib/format";

interface Props {
  telegramId: number;
  onClose: () => void;
  onChanged: () => void;
}

function statusLabel(status: string | null): string {
  if (!status) return "Yaratildi";
  return STATUS_LABELS[status as OrderStatus] ?? status;
}

export function CustomerDetailPanel({ telegramId, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingBlacklist, setConfirmingBlacklist] = useState(false);

  useEffect(() => {
    setDetail(null);
    setError(null);
    api
      .get<AdminUserDetail>(`/admin/users/${telegramId}`)
      .then(setDetail)
      .catch(() => setError("Mijoz ma'lumotlarini yuklab bo'lmadi"));
  }, [telegramId]);

  async function toggleBlacklist() {
    if (!detail) return;
    setSaving(true);
    try {
      const updated = await api.patch<AdminUserDetail>(`/admin/users/${telegramId}`, {
        isBlacklisted: !detail.isBlacklisted,
      });
      setDetail({ ...detail, isBlacklisted: updated.isBlacklisted });
      setConfirmingBlacklist(false);
      onChanged();
    } catch {
      setError("O'zgartirib bo'lmadi — qayta urinib ko'ring.");
    } finally {
      setSaving(false);
    }
  }

  const fullName = detail
    ? [detail.firstName, detail.lastName].filter(Boolean).join(" ").trim() || "Ism kiritilmagan"
    : "";

  // Group the flat order_logs stream by order so each order reads as its own
  // little story rather than one long interleaved list.
  const timelineByOrder = new Map<number, AdminUserDetail["timeline"]>();
  for (const entry of detail?.timeline ?? []) {
    const bucket = timelineByOrder.get(entry.orderId) ?? [];
    bucket.push(entry);
    timelineByOrder.set(entry.orderId, bucket);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl"
      >
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {!detail ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-stone-200/60" />
            ))}
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-stone-900">{fullName}</h2>
                <p className="text-sm text-stone-400">
                  {detail.username ? `@${detail.username} · ` : ""}ID {detail.telegramId}
                </p>
              </div>
              <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-400 hover:bg-stone-100">
                Yopish
              </button>
            </div>

            {/* Contact — the whole point of this panel for support. */}
            <div className="mb-5 flex flex-wrap gap-2">
              {detail.contact.telegramUrl ? (
                <a
                  href={detail.contact.telegramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/20"
                >
                  Telegramda yozish
                </a>
              ) : null}
              {detail.contact.telUrl ? (
                <a
                  href={detail.contact.telUrl}
                  className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700"
                >
                  {detail.phoneNumber}
                </a>
              ) : null}
              {!detail.contact.telegramUrl && !detail.contact.telUrl && (
                <p className="text-sm text-stone-400">
                  Aloqa ma'lumoti yo'q — bu mijozga faqat bot orqali yozish mumkin.
                </p>
              )}
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Buyurtmalar" value={String(detail.orderCount)} />
              <Stat label="Yetkazilgan" value={String(detail.completedOrdersCount)} />
              <Stat label="Bekor qilgan" value={String(detail.cancelledOrdersCount)} />
              <Stat label="Sarflagan" value={formatSom(detail.totalSpent)} />
            </div>

            <div className="mb-5 flex flex-wrap gap-2 text-xs font-bold">
              <span
                className={`rounded-full px-2.5 py-1 ${
                  detail.isProfileComplete ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {detail.isProfileComplete ? "Profil to'liq" : "Profil to'liq emas"}
              </span>
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-600">
                Ro'yxatdan o'tgan: {formatFullDate(detail.createdAt)}
              </span>
              {detail.isBlacklisted && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">Qora ro'yxatda</span>
              )}
            </div>

            <Section title={`Saqlangan manzillar (${detail.savedAddresses.length})`}>
              {detail.savedAddresses.length === 0 ? (
                <p className="text-sm text-stone-400">Manzil saqlanmagan.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {detail.savedAddresses.map((address) => (
                    <div key={address.id} className="rounded-xl border border-stone-100 px-3 py-2">
                      <p className="text-sm font-semibold text-stone-900">{address.label}</p>
                      <p className="text-xs text-stone-500">{address.landmarkAddress}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title={`Buyurtmalar (${detail.orders.length})`}>
              {detail.orders.length === 0 ? (
                <p className="text-sm text-stone-400">Hali buyurtma bermagan.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {detail.orders.map((order) => (
                    <div key={order.id} className="rounded-xl border border-stone-100 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-stone-900">#{order.id}</span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[order.status]}`}
                        >
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-stone-500">
                        {order.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-stone-400">{formatShortDate(order.createdAt)}</span>
                        <span className="font-mono font-semibold text-stone-900">{formatSom(order.totalAmount)}</span>
                      </div>

                      {(timelineByOrder.get(order.id) ?? []).length > 0 && (
                        <ol className="mt-2 border-t border-stone-100 pt-2">
                          {(timelineByOrder.get(order.id) ?? [])
                            .slice()
                            .reverse()
                            .map((entry, i) => (
                              <li key={i} className="flex justify-between py-0.5 text-xs text-stone-500">
                                <span>
                                  {statusLabel(entry.previousStatus)} → <strong>{statusLabel(entry.newStatus)}</strong>
                                  <span className="ml-1 text-stone-400">({entry.changedBy})</span>
                                </span>
                                <span className="text-stone-400">
                                  {entry.timestamp ? formatShortDate(entry.timestamp) : "—"}
                                </span>
                              </li>
                            ))}
                        </ol>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <div className="mt-6 border-t border-stone-100 pt-4">
              {confirmingBlacklist ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-600">
                    {detail.isBlacklisted ? "Qora ro'yxatdan chiqarilsinmi?" : "Qora ro'yxatga qo'shilsinmi?"}
                  </span>
                  <button
                    onClick={toggleBlacklist}
                    disabled={saving}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Saqlanmoqda…" : "Ha"}
                  </button>
                  <button
                    onClick={() => setConfirmingBlacklist(false)}
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-semibold text-stone-600"
                  >
                    Yo'q
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingBlacklist(true)}
                  className="text-sm font-semibold text-red-600 hover:text-red-800"
                >
                  {detail.isBlacklisted ? "Qora ro'yxatdan chiqarish" : "Qora ro'yxatga qo'shish"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-stone-400">{label}</p>
      <p className="text-base font-extrabold text-stone-900">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-stone-400">{title}</h3>
      {children}
    </div>
  );
}
