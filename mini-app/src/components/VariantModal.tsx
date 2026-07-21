import type { Product } from "@mydoners/shared-contracts";
import { formatSom } from "../lib/format";

interface VariantModalProps {
  product: Product;
  onSelect: (variant: "Beef" | "Chicken") => void;
  onClose: () => void;
}

// Enforces the forced Beef/Chicken choice before a meat-choice product can be
// added to the cart — no way to add one without picking a variant.
export function VariantModal({ product, onSelect, onClose }: VariantModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-bold">{product.name}</h2>
        <p className="mb-4 text-sm text-black/60">Choose your meat</p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onSelect("Beef")}
            className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3 text-left active:bg-black/5"
          >
            <span className="font-semibold">Beef</span>
            <span className="text-brand">{formatSom(Number(product.beefPrice))}</span>
          </button>
          <button
            onClick={() => onSelect("Chicken")}
            className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3 text-left active:bg-black/5"
          >
            <span className="font-semibold">Chicken</span>
            <span className="text-brand">{formatSom(Number(product.chickenPrice))}</span>
          </button>
        </div>

        <button onClick={onClose} className="mt-4 w-full py-2 text-center text-sm text-black/50">
          Cancel
        </button>
      </div>
    </div>
  );
}
