import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { AdminCategory, AdminProduct } from "../api/types";
import { ProductForm, type ProductFormValues } from "../components/ProductForm";

function formatSom(amount: number | null): string {
  return amount === null ? "—" : `${amount.toLocaleString("en-US")} UZS`;
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
    if (!confirm(`Delete "${product.name}"?`)) return;
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

  if (loading) return <p className="text-black/40">Loading…</p>;

  return (
    <div>
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageSelected} />

      <div className="mb-4 flex justify-between">
        <h2 className="text-lg font-bold">Products ({products.length})</h2>
        <button
          onClick={() => setEditing("new")}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          + Add product
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/5 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/5 text-left text-black/50">
            <tr>
              <th className="px-4 py-2">Photo</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Available</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-2">
                  {product.imageUrl && (
                    <img src={product.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
                  )}
                </td>
                <td className="px-4 py-2 font-medium">{product.name}</td>
                <td className="px-4 py-2 text-black/60">
                  {product.categoryId ? categoryById.get(product.categoryId) : "—"}
                </td>
                <td className="px-4 py-2">
                  {product.hasMeatChoice
                    ? `${formatSom(product.chickenPrice)} – ${formatSom(product.beefPrice)}`
                    : formatSom(product.basePrice)}
                </td>
                <td className="px-4 py-2">
                  <button onClick={() => handleToggleAvailable(product)}>
                    {product.isAvailable ? "✅" : "🚫"}
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-2">
                  <button onClick={() => triggerImageUpload(product.id)} className="mr-3 text-black/50 hover:text-black">
                    Photo
                  </button>
                  <button onClick={() => setEditing(product)} className="mr-3 text-black/50 hover:text-black">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(product)} className="text-red-600 hover:text-red-800">
                    Delete
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
