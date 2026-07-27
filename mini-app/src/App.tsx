import type { ReactNode } from "react";
import { useTelegramAuth } from "./hooks/useTelegramAuth";
import { useResumeActiveOrder } from "./hooks/useResumeActiveOrder";
import { useUiStore } from "./store/uiStore";
import { MenuPage } from "./pages/MenuPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { OrderTrackingPage } from "./pages/OrderTrackingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { t } from "./i18n/strings";

function AppShell({ children }: { children: ReactNode }) {
  // Locks the whole app to a phone-width column, centered on wider viewports
  // (e.g. a desktop browser tab, not just inside Telegram). `position: fixed`
  // pins this to the real viewport and establishes the containing block for
  // absolutely-positioned descendants (bottom bars, the variant modal).
  // Deliberately NOT `overflow-y-auto` here — that would clip/scroll away
  // any absolutely-positioned descendant along with the content, since CSS
  // overflow clipping follows DOM containment regardless of an element's own
  // `position`. Each page scrolls its own content internally instead (see
  // MenuPage/CartPage/CheckoutPage) and keeps floating buttons as siblings
  // of the scrollable area, not descendants of it.
  return (
    <div className="fixed inset-0 mx-auto flex max-w-[480px] flex-col overflow-hidden bg-[#f7f4f2] shadow-2xl">
      {children}
      <div id="modal-root" className="pointer-events-none absolute inset-0 z-50" />
    </div>
  );
}

export function App() {
  const { status, error } = useTelegramAuth();
  const screen = useUiStore((s) => s.screen);

  // Only fires its check once auth has actually succeeded — it makes an
  // authenticated API call, and does nothing if there's no persisted order.
  useResumeActiveOrder(status === "ready");

  if (status === "loading") {
    return (
      <AppShell>
        <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
          <p className="text-sm font-medium text-stone-400">{t("loadingApp")}</p>
        </div>
      </AppShell>
    );
  }

  if (status === "error") {
    return (
      <AppShell>
        <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-3xl">😕</p>
          <p className="font-semibold text-stone-900">{t("signInFailed")}</p>
          <p className="text-sm text-stone-500">{error}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {screen === "menu" && <MenuPage />}
      {screen === "cart" && <CartPage />}
      {screen === "checkout" && <CheckoutPage />}
      {screen === "tracking" && <OrderTrackingPage />}
      {screen === "profile" && <ProfilePage />}
    </AppShell>
  );
}
