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
    <div className="flex min-h-screen flex-col pb-28">
      <header className="flex items-center gap-3 px-4 pt-4">
        <button onClick={() => goTo("menu")} className="text-lg">
          ←
        </button>
        <h1 className="text-lg font-bold">Your cart</h1>
      </header>

      {lines.length === 0 ? (
        <p className="py-16 text-center text-black/40">Your cart is empty.</p>
      ) : (
        <div className="flex flex-col gap-2 px-4 pt-4">
          {lines.map((line) => {
            const key = `${line.product.id}:${line.selectedVariant ?? ""}`;
            const unitPrice = unitPriceFor(line.product, line.selectedVariant);
            return (
              <div key={key} className="flex items-center justify-between gap-2 rounded-xl border border-black/5 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{line.product.name}</p>
                  {line.selectedVariant && <p className="text-sm text-black/50">{line.selectedVariant}</p>}
                  <p className="text-sm text-brand">{formatSom(unitPrice * line.quantity)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(line.product.id, line.selectedVariant, line.quantity - 1)}
                    className="h-8 w-8 rounded-full bg-black/5 text-lg leading-none"
                  >
                    −
                  </button>
                  <span className="w-4 text-center">{line.quantity}</span>
                  <button
                    onClick={() => setQuantity(line.product.id, line.selectedVariant, line.quantity + 1)}
                    className="h-8 w-8 rounded-full bg-black/5 text-lg leading-none"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lines.length > 0 && (
        <button
          onClick={() => goTo("checkout")}
          className="fixed inset-x-4 bottom-4 flex items-center justify-between rounded-2xl bg-brand px-5 py-3.5 font-semibold text-white shadow-lg"
        >
          <span>Checkout</span>
          <span>{formatSom(totalAmount)}</span>
        </button>
      )}
    </div>
  );
}
