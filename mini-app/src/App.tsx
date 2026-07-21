import { useTelegramAuth } from "./hooks/useTelegramAuth";
import { useUiStore } from "./store/uiStore";
import { MenuPage } from "./pages/MenuPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { OrderTrackingPage } from "./pages/OrderTrackingPage";

export function App() {
  const { status, error } = useTelegramAuth();
  const screen = useUiStore((s) => s.screen);

  if (status === "loading") {
    return <p className="py-16 text-center text-black/40">Loading MyDoners…</p>;
  }

  if (status === "error") {
    return (
      <div className="px-4 pt-16 text-center">
        <p className="font-semibold text-red-600">Couldn't sign you in</p>
        <p className="mt-1 text-sm text-black/50">{error}</p>
      </div>
    );
  }

  switch (screen) {
    case "menu":
      return <MenuPage />;
    case "cart":
      return <CartPage />;
    case "checkout":
      return <CheckoutPage />;
    case "tracking":
      return <OrderTrackingPage />;
  }
}
