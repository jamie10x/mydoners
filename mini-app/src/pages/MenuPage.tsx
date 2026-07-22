import { useEffect, useState } from "react";
import type { Category, Product } from "@mydoners/shared-contracts";
import { api } from "../api/client";
import { CategoryTabs } from "../components/CategoryTabs";
import { ProductCard } from "../components/ProductCard";
import { useCartStore } from "../store/cartStore";
import { useUiStore } from "../store/uiStore";
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

  const itemCount = useCartStore((s) => s.itemCount());
  const totalAmount = useCartStore((s) => s.totalAmount());
  const goTo = useUiStore((s) => s.goTo);

  useEffect(() => {
    api.get<Category[]>("/categories").then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    const query = activeCategoryId ? `?categoryId=${activeCategoryId}` : "";
    api
      .get<PaginatedProducts>(`/products${query}`)
      .then((res) => setProducts(res.items))
      .finally(() => setLoading(false));
  }, [activeCategoryId]);

  return (
    // relative + min-h-0 so the scrollable area below can size correctly
    // inside the app shell's flex column, and the floating cart bar (a
    // sibling, not a descendant, of the scroll area) never scrolls away.
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className={`min-h-0 flex-1 overflow-y-auto ${itemCount > 0 ? "pb-24" : "pb-6"}`}>
        <header className="sticky top-0 z-10 border-b border-stone-100 bg-[#f7f4f2]/95 px-4 pb-3 pt-5 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="" className="h-9 w-9 shrink-0 rounded-full" />
            <div>
              <h1 className="text-lg font-extrabold leading-tight text-stone-900">MyDoners</h1>
              <p className="text-xs text-stone-400">Halol va sifatli fast food</p>
            </div>
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
          {!loading && products.length === 0 && (
            <p className="py-16 text-center text-sm text-stone-400">No items here yet.</p>
          )}
          {products.map((product) => (
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
