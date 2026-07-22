import { useCartStore, unitPriceFor } from "../store/cartStore";
import { useUiStore } from "../store/uiStore";
import { formatSom } from "../lib/format";

export function CartPage() {
  const linesByKey = useCartStore((s) => s.lines);
  const lines = Object.values(linesByKey);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const totalAmount = useCartStore((s) => s.totalAmount());
  const goTo = useUiStore((s) => s.goTo);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className={`min-h-0 flex-1 overflow-y-auto ${lines.length > 0 ? "pb-28" : ""}`}>
        <header className="flex items-center gap-3 px-4 pt-5">
          <button
            onClick={() => goTo("menu")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200/70 text-stone-700"
          >
            ←
          </button>
          <h1 className="text-lg font-extrabold text-stone-900">Your cart</h1>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <p className="text-3xl">🛒</p>
            <p className="text-sm font-medium text-stone-400">Your cart is empty.</p>
            <button onClick={() => goTo("menu")} className="mt-2 text-sm font-semibold text-brand">
              Browse the menu →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 px-4 pt-4">
            {lines.map((line) => {
              const key = `${line.product.id}:${line.selectedVariant ?? ""}`;
              const unitPrice = unitPriceFor(line.product, line.selectedVariant);
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-stone-100 bg-white p-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-stone-900">{line.product.name}</p>
                    {line.selectedVariant && <p className="text-sm text-stone-400">{line.selectedVariant}</p>}
                    <p className="text-sm font-bold text-brand">{formatSom(unitPrice * line.quantity)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(line.product.id, line.selectedVariant, line.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200/70 text-lg font-semibold leading-none text-stone-700"
                    >
                      −
                    </button>
                    <span className="w-4 text-center font-semibold text-stone-900">{line.quantity}</span>
                    <button
                      onClick={() => setQuantity(line.product.id, line.selectedVariant, line.quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200/70 text-lg font-semibold leading-none text-stone-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {lines.length > 0 && (
        <button
          onClick={() => goTo("checkout")}
          className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl bg-brand px-5 py-3.5 font-semibold text-white shadow-lg shadow-brand/30 active:bg-brand-dark"
        >
          <span>Checkout</span>
          <span>{formatSom(totalAmount)}</span>
        </button>
      )}
    </div>
  );
}
