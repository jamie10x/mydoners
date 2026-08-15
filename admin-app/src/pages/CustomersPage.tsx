import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { AdminUser, AdminUserStats, UserSegment, UserSort } from "../api/types";
import { StatCard } from "../components/StatCard";
import { CustomerDetailPanel } from "../components/CustomerDetailPanel";
import { formatRelativeDays, formatSom, formatFullDate, qs } from "../lib/format";

const SEGMENTS: Array<{ value: UserSegment; label: string }> = [
  { value: "all", label: "Barchasi" },
  { value: "incomplete_profile", label: "Profil to'liq emas" },
  { value: "never_ordered", label: "Buyurtma bermagan" },
  { value: "lapsed", label: "Yo'qolgan mijozlar" },
  { value: "repeat", label: "Doimiy mijozlar" },
  { value: "high_cancel", label: "Ko'p bekor qilgan" },
  { value: "blacklisted", label: "Qora ro'yxat" },
];

const SORTS: Array<{ value: UserSort; label: string }> = [
  { value: "createdAt", label: "Ro'yxatdan o'tgan" },
  { value: "lastOrderAt", label: "Oxirgi buyurtma" },
  { value: "completedOrdersCount", label: "Buyurtmalar soni" },
  { value: "cancelledOrdersCount", label: "Bekor qilganlari" },
  { value: "name", label: "Ism" },
];

const PAGE_SIZE = 25;

function displayName(user: AdminUser): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || "Ism kiritilmagan";
}

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [segment, setSegment] = useState<UserSegment>("all");
  const [sort, setSort] = useState<UserSort>("createdAt");
  const [offset, setOffset] = useState(0);

  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Debounced so typing a name doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [debouncedSearch, segment, sort, offset]);

  function reload() {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<AdminUserStats>("/admin/users/stats"),
      api.get<{ total: number; users: AdminUser[] }>(
        `/admin/users?${qs({ q: debouncedSearch, segment, sort, limit: PAGE_SIZE, offset })}`,
      ),
    ])
      .then(([statsRes, listRes]) => {
        setStats(statsRes);
        setUsers(listRes.users);
        setTotal(listRes.total);
      })
      .catch(() => setError("Mijozlar ro'yxatini yuklab bo'lmadi"))
      .finally(() => setLoading(false));
  }

  // Any filter change has to reset paging — otherwise switching segment while
  // on page 3 lands on an offset the new result set doesn't reach.
  function changeFilter(apply: () => void) {
    apply();
    setOffset(0);
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Jami mijozlar" value={String(stats?.totalUsers ?? 0)} />
        <StatCard label="Yangi (30 kun)" value={String(stats?.newInRange ?? 0)} />
        <StatCard label="Faol (30 kun)" value={String(stats?.activeInRange ?? 0)} />
        <StatCard label="Profil to'liq emas" value={String(stats?.incompleteProfiles ?? 0)} accent />
        <StatCard label="Qora ro'yxat" value={String(stats?.blacklisted ?? 0)} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {SEGMENTS.map((option) => (
          <button
            key={option.value}
            onClick={() => changeFilter(() => setSegment(option.value))}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              segment === option.value ? "bg-brand text-white" : "bg-stone-200/70 text-stone-600"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-400">Qidiruv</label>
          <input
            value={search}
            onChange={(e) => changeFilter(() => setSearch(e.target.value))}
            placeholder="Ism, @username, telefon yoki ID"
            className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-base outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-stone-400">Saralash</label>
          <select
            value={sort}
            onChange={(e) => changeFilter(() => setSort(e.target.value as UserSort))}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-base outline-none focus:border-brand"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-stone-200/60" />
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-100 text-left text-xs font-bold uppercase tracking-wide text-stone-400">
                <tr>
                  <th className="px-4 py-3">Mijoz</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Buyurtmalar</th>
                  <th className="px-4 py-3">Sarflagan</th>
                  <th className="px-4 py-3">Oxirgi buyurtma</th>
                  <th className="px-4 py-3">Ro'yxatdan o'tgan</th>
                  <th className="px-4 py-3">Holat</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.telegramId}
                    onClick={() => setSelectedId(user.telegramId)}
                    className="cursor-pointer border-b border-stone-100 last:border-0 hover:bg-stone-50/60"
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-stone-900">{displayName(user)}</p>
                      <p className="text-xs text-stone-400">
                        {user.username ? `@${user.username}` : `ID ${user.telegramId}`}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-stone-700">
                      {user.phoneNumber ?? <span className="text-stone-300">—</span>}
                      {user.isPhoneVerified && <span className="ml-1 text-green-600">✓</span>}
                    </td>
                    <td className="px-4 py-2.5 text-stone-700">
                      {user.orderCount}
                      {user.cancelledOrdersCount > 0 && (
                        <span className="ml-1 text-xs text-red-500">({user.cancelledOrdersCount} bekor)</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-stone-900">
                      {formatSom(user.totalSpent)}
                    </td>
                    <td className="px-4 py-2.5 text-stone-500">{formatRelativeDays(user.lastOrderAt)}</td>
                    <td className="px-4 py-2.5 text-stone-500">{formatFullDate(user.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {user.isBlacklisted && (
                        <span className="mr-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                          Qora ro'yxat
                        </span>
                      )}
                      {!user.isProfileComplete && (
                        <span className="mr-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                          To'liq emas
                        </span>
                      )}
                      {user.isProfileComplete && !user.isBlacklisted && user.completedOrdersCount >= 5 && (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                          Doimiy
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-stone-400">
                      Bu filtrga mos mijoz topilmadi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {total > PAGE_SIZE && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <button
                onClick={() => setOffset(Math.max(offset - PAGE_SIZE, 0))}
                disabled={offset === 0}
                className="rounded-lg border border-stone-200 px-3 py-1.5 font-semibold text-stone-600 disabled:opacity-40"
              >
                ← Oldingi
              </button>
              <span className="text-stone-400">
                {offset + 1}–{offset + users.length} / {total}
              </span>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + users.length >= total}
                className="rounded-lg border border-stone-200 px-3 py-1.5 font-semibold text-stone-600 disabled:opacity-40"
              >
                Keyingi →
              </button>
            </div>
          )}
        </>
      )}

      {selectedId !== null && (
        <CustomerDetailPanel
          telegramId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}
