import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Product } from "@mydoners/shared-contracts";
import { formatSom } from "../lib/format";
import { t } from "../i18n/strings";

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
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    // Remember what had focus before the modal opened, so closing it (any
    // way — Escape, backdrop, Cancel, or picking a variant) returns focus
    // there instead of dropping it to <body>.
    triggerRef.current = document.activeElement;
    sheetRef.current?.querySelector<HTMLElement>("button")?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;

      // Basic focus trap: wrap Tab/Shift+Tab between the sheet's first and
      // last focusable elements instead of letting focus escape to the page
      // scrolling underneath.
      const focusable = sheetRef.current.querySelectorAll<HTMLElement>("button");
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) return null;

  return createPortal(
    <div className="pointer-events-auto absolute inset-0 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="variant-modal-title"
        className="w-full max-w-md rounded-t-2xl bg-white p-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="variant-modal-title" className="mb-1 text-lg font-bold text-stone-900">
          {product.name}
        </h2>
        <p className="mb-4 text-sm text-stone-500">{t("chooseMeat")}</p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onSelect("Beef")}
            className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 text-left active:bg-stone-50"
          >
            <span className="font-semibold text-stone-900">{t("beef")}</span>
            <span className="font-semibold text-brand">{formatSom(Number(product.beefPrice))}</span>
          </button>
          <button
            onClick={() => onSelect("Chicken")}
            className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 text-left active:bg-stone-50"
          >
            <span className="font-semibold text-stone-900">{t("chicken")}</span>
            <span className="font-semibold text-brand">{formatSom(Number(product.chickenPrice))}</span>
          </button>
        </div>

        <button onClick={onClose} className="mt-4 w-full py-2 text-center text-sm font-medium text-stone-400">
          {t("cancel")}
        </button>
      </div>
    </div>,
    modalRoot,
  );
}
