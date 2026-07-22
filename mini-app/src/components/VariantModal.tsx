import { createPortal } from "react-dom";
import type { Product } from "@mydoners/shared-contracts";
import { formatSom } from "../lib/format";

interface VariantModalProps {
  product: Product;
  onSelect: (variant: "Beef" | "Chicken") => void;
  onClose: () => void;
}

// Enforces the forced Beef/Chicken choice before a meat-choice product can be
// added to the cart — no way to add one without picking a variant.
// Rendered via a portal into #modal-root (a direct child of the app shell,
// not nested inside any scrollable page content) so it can't get clipped or
// scrolled away by an ancestor's overflow, and always covers the full phone-
// width shell regardless of where in the tree it's triggered from.
export function VariantModal({ product, onSelect, onClose }: VariantModalProps) {
  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) return null;

  return createPortal(
    <div className="pointer-events-auto absolute inset-0 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-4 pb-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-bold text-stone-900">{product.name}</h2>
        <p className="mb-4 text-sm text-stone-500">Choose your meat</p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onSelect("Beef")}
            className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 text-left active:bg-stone-50"
          >
            <span className="font-semibold text-stone-900">Beef</span>
            <span className="font-semibold text-brand">{formatSom(Number(product.beefPrice))}</span>
          </button>
          <button
            onClick={() => onSelect("Chicken")}
            className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 text-left active:bg-stone-50"
          >
            <span className="font-semibold text-stone-900">Chicken</span>
            <span className="font-semibold text-brand">{formatSom(Number(product.chickenPrice))}</span>
          </button>
        </div>

        <button onClick={onClose} className="mt-4 w-full py-2 text-center text-sm font-medium text-stone-400">
          Cancel
        </button>
      </div>
    </div>,
    modalRoot,
  );
}
