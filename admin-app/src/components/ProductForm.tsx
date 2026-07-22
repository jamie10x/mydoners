import { useState } from "react";
import type { AdminCategory, AdminProduct } from "../api/types";

export interface ProductFormValues {
  categoryId: number;
  name: string;
  description: string | null;
  hasMeatChoice: boolean;
  basePrice?: number;
  beefPrice?: number;
  chickenPrice?: number;
  isAvailable: boolean;
}

interface ProductFormProps {
  categories: AdminCategory[];
  initial?: AdminProduct;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({ categories, initial, onSubmit, onCancel }: ProductFormProps) {
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? 0);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [hasMeatChoice, setHasMeatChoice] = useState(initial?.hasMeatChoice ?? false);
  const [basePrice, setBasePrice] = useState(String(initial?.basePrice ?? ""));
  const [beefPrice, setBeefPrice] = useState(String(initial?.beefPrice ?? ""));
  const [chickenPrice, setChickenPrice] = useState(String(initial?.chickenPrice ?? ""));
  const [isAvailable, setIsAvailable] = useState(initial?.isAvailable ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        categoryId,
        name: name.trim(),
        description: description.trim() || null,
        hasMeatChoice,
        basePrice: hasMeatChoice ? undefined : Number(basePrice),
        beefPrice: hasMeatChoice ? Number(beefPrice) : undefined,
        chickenPrice: hasMeatChoice ? Number(chickenPrice) : undefined,
        isAvailable,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-6"
      >
        <h2 className="text-lg font-bold">{initial ? "Edit product" : "New product"}</h2>

        <label className="text-sm font-medium text-black/60">
          Category
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-black/60">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm font-medium text-black/60">
          Description (optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-black/60">
          <input type="checkbox" checked={hasMeatChoice} onChange={(e) => setHasMeatChoice(e.target.checked)} />
          Requires Beef/Chicken choice
        </label>

        {hasMeatChoice ? (
          <div className="flex gap-3">
            <label className="flex-1 text-sm font-medium text-black/60">
              Beef price (UZS)
              <input
                type="number"
                value={beefPrice}
                onChange={(e) => setBeefPrice(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex-1 text-sm font-medium text-black/60">
              Chicken price (UZS)
              <input
                type="number"
                value={chickenPrice}
                onChange={(e) => setChickenPrice(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </label>
          </div>
        ) : (
          <label className="text-sm font-medium text-black/60">
            Price (UZS)
            <input
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
          </label>
        )}

        <label className="flex items-center gap-2 text-sm font-medium text-black/60">
          <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
          Available on the menu
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-black/10 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !categoryId}
            className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
