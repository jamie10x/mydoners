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
    <div className="pb-24">
      <header className="px-4 pb-2 pt-4">
        <h1 className="text-xl font-bold">MyDoners</h1>
      </header>

      <CategoryTabs categories={categories} activeCategoryId={activeCategoryId} onSelect={setActiveCategoryId} />

      <div className="flex flex-col gap-2 px-4 pt-2">
        {loading && <p className="py-8 text-center text-black/40">Loading menu…</p>}
        {!loading && products.length === 0 && <p className="py-8 text-center text-black/40">No items here yet.</p>}
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {itemCount > 0 && (
        <button
          onClick={() => goTo("cart")}
          className="fixed inset-x-4 bottom-4 flex items-center justify-between rounded-2xl bg-brand px-5 py-3.5 font-semibold text-white shadow-lg"
        >
          <span>View cart · {itemCount} item{itemCount > 1 ? "s" : ""}</span>
          <span>{formatSom(totalAmount)}</span>
        </button>
      )}
    </div>
  );
}
