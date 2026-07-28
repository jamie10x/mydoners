import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { AdminCategory, AdminProduct } from "../api/types";
import { ProductForm, type ProductFormValues } from "../components/ProductForm";

// Space-grouped digits + "so'm" — matches mini-app's src/lib/format.ts.
function formatSom(amount: number | null): string {
  if (amount === null) return "—";
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped} so'm`;
}

export function ProductsPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminProduct | "new" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetId = useRef<number | null>(null);

  function reload() {
    setLoading(true);
    Promise.all([api.get<AdminCategory[]>("/admin/categories"), api.get<AdminProduct[]>("/admin/products")])
      .then(([cats, prods]) => {
        setCategories(cats);
        setProducts(prods);
      })
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function handleSave(values: ProductFormValues) {
    if (editing === "new") {
      await api.post("/admin/products", values);
    } else if (editing) {
      await api.patch(`/admin/products/${editing.id}`, values);
    }
    setEditing(null);
    reload();
  }

  async function handleDelete(product: AdminProduct) {
    if (!confirm(`"${product.name}"ni o'chirasizmi?`)) return;
    await api.delete(`/admin/products/${product.id}`);
    reload();
  }

  async function handleToggleAvailable(product: AdminProduct) {
    await api.patch(`/admin/products/${product.id}`, { isAvailable: !product.isAvailable });
    reload();
  }

  function triggerImageUpload(productId: number) {
    uploadTargetId.current = productId;
    fileInputRef.current?.click();
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const productId = uploadTargetId.current;
    e.target.value = "";
    if (!file || !productId) return;

    const form = new FormData();
    form.append("image", file);
    await api.post(`/admin/products/${productId}/image`, form);
    reload();
  }

  const categoryById = new Map(categories.map((c) => [c.id, c.name]));

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-stone-200/60" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageSelected} />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-stone-900">
          Mahsulotlar <span className="font-medium text-stone-400">({products.length})</span>
        </h2>
        <button
          onClick={() => setEditing("new")}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/20"
        >
          + Mahsulot qo'shish
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-100 text-left text-xs font-bold uppercase tracking-wide text-stone-400">
            <tr>
              <th className="px-4 py-3">Rasm</th>
              <th className="px-4 py-3">Nomi</th>
              <th className="px-4 py-3">Kategoriya</th>
              <th className="px-4 py-3">Narx</th>
              <th className="px-4 py-3">Holat</th>
              <th className="px-4 py-3">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                <td className="px-4 py-2.5">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-10 w-10 rounded-lg border border-stone-100 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-100 bg-stone-50">
                      <img src="/logo.svg" alt="" className="h-5 w-5 rounded opacity-70" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5 font-semibold text-stone-900">{product.name}</td>
                <td className="px-4 py-2.5 text-stone-500">
                  {product.categoryId ? categoryById.get(product.categoryId) : "—"}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-stone-700">
                  {product.hasMeatChoice
                    ? `${formatSom(product.chickenPrice)} – ${formatSom(product.beefPrice)}`
                    : formatSom(product.basePrice)}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => handleToggleAvailable(product)}
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      product.isAvailable ? "bg-green-100 text-green-700" : "bg-stone-200 text-stone-500"
                    }`}
                  >
                    {product.isAvailable ? "Mavjud" : "Yashirilgan"}
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <button
                    onClick={() => triggerImageUpload(product.id)}
                    className="mr-3 text-sm font-medium text-stone-500 hover:text-stone-900"
                  >
                    Rasm
                  </button>
                  <button
                    onClick={() => setEditing(product)}
                    className="mr-3 text-sm font-medium text-stone-500 hover:text-stone-900"
                  >
                    Tahrirlash
                  </button>
                  <button onClick={() => handleDelete(product)} className="text-sm font-medium text-red-600 hover:text-red-800">
                    O'chirish
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductForm
          categories={categories}
          initial={editing === "new" ? undefined : editing}
          onSubmit={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
