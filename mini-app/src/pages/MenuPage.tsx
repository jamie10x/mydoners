import { useEffect, useState } from "react";
import type { Category, Product } from "@mydoners/shared-contracts";
import { api } from "../api/client";
import { CategoryTabs } from "../components/CategoryTabs";
import { ErrorState } from "../components/ErrorState";
import { ProductCard } from "../components/ProductCard";
import { useCartStore } from "../store/cartStore";
import { useUiStore } from "../store/uiStore";
import { useAuthStore } from "../store/authStore";
import { formatSom } from "../lib/format";

interface PaginatedProducts {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
}

export function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  // Bumping this refetches both categories and products — the Retry action.
  const [reloadKey, setReloadKey] = useState(0);

  const itemCount = useCartStore((s) => s.itemCount());
  const totalAmount = useCartStore((s) => s.totalAmount());
  const goTo = useUiStore((s) => s.goTo);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Categories failing alone isn't fatal (the "All" view still works), so
    // only the products request drives the error state below.
    api
      .get<Category[]>("/categories")
      .then(setCategories)
      .catch(() => {});
  }, [reloadKey]);

  useEffect(() => {
    setLoading(true);
    setLoadFailed(false);
    const query = activeCategoryId ? `?categoryId=${activeCategoryId}` : "";
    api
      .get<PaginatedProducts>(`/products${query}`)
      .then((res) => setProducts(res.items))
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, [activeCategoryId, reloadKey]);

  return (
    // relative + min-h-0 so the scrollable area below can size correctly
    // inside the app shell's flex column, and the floating cart bar (a
    // sibling, not a descendant, of the scroll area) never scrolls away.
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className={`min-h-0 flex-1 overflow-y-auto ${itemCount > 0 ? "pb-24" : "pb-6"}`}>
        <header className="sticky top-0 z-10 border-b border-stone-100 bg-[#f7f4f2]/95 px-4 pb-3 pt-5 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="" className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-extrabold leading-tight text-stone-900">MyDoners</h1>
              <p className="text-xs text-stone-400">Halol va sifatli fast food</p>
            </div>
            <button
              onClick={() => goTo("profile")}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700"
              aria-label="Profile"
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="3.4" />
                <path d="M5 20c1.5-4 4.5-6 7-6s5.5 2 7 6" />
              </svg>
              {user && !user.isProfileComplete && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand" />
              )}
            </button>
          </div>
          <div className="mt-3 -mx-4">
            <CategoryTabs categories={categories} activeCategoryId={activeCategoryId} onSelect={setActiveCategoryId} />
          </div>
        </header>

        <div className="flex flex-col gap-2.5 px-4 pt-3">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-stone-200/60" />
            ))}
          {!loading && loadFailed && (
            <ErrorState
              message="Couldn't load the menu — check your connection."
              onRetry={() => setReloadKey((k) => k + 1)}
            />
          )}
          {!loading && !loadFailed && products.length === 0 && (
            <p className="py-16 text-center text-sm text-stone-400">No items here yet.</p>
          )}
          {!loadFailed && products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      {itemCount > 0 && (
        <button
          onClick={() => goTo("cart")}
          className="absolute inset-x-4 bottom-4 z-20 flex items-center justify-between rounded-2xl bg-brand px-5 py-3.5 font-semibold text-white shadow-lg shadow-brand/30 active:bg-brand-dark"
        >
          <span>
            🛒 View cart · {itemCount} item{itemCount > 1 ? "s" : ""}
          </span>
          <span>{formatSom(totalAmount)}</span>
        </button>
      )}
    </div>
  );
}
