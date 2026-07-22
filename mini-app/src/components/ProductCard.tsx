import { useState } from "react";
import type { Product } from "@mydoners/shared-contracts";
import { useCartStore } from "../store/cartStore";
import { VariantModal } from "./VariantModal";
import { formatSom } from "../lib/format";

export function ProductCard({ product }: { product: Product }) {
  const [showVariantModal, setShowVariantModal] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const displayPrice = product.hasMeatChoice
    ? `${formatSom(Number(product.chickenPrice))} – ${formatSom(Number(product.beefPrice))}`
    : formatSom(Number(product.basePrice));

  function handleAdd() {
    if (product.hasMeatChoice) {
      setShowVariantModal(true);
      return;
    }
    addItem(product, null);
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-3 shadow-sm">
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-xl border border-stone-100 object-cover"
          loading="lazy"
        />
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-stone-900">{product.name}</h3>
        {product.description && <p className="mt-0.5 truncate text-sm text-stone-400">{product.description}</p>}
        <p className="mt-1 text-sm font-bold text-brand">{displayPrice}</p>
      </div>
      <button
        onClick={handleAdd}
        className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white active:bg-brand-dark"
      >
        Add
      </button>

      {showVariantModal && (
        <VariantModal
          product={product}
          onSelect={(variant) => {
            addItem(product, variant);
            setShowVariantModal(false);
          }}
          onClose={() => setShowVariantModal(false)}
        />
      )}
    </div>
  );
}
