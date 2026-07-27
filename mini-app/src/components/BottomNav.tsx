import type { ReactNode } from "react";
import { useCartStore } from "../store/cartStore";
import { useUiStore, type Screen } from "../store/uiStore";
import { t } from "../i18n/strings";

function MenuIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2}>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2}>
      <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <path d="M2.5 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L20.5 8H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OrderIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2}>
      <path d="M6 3h12v16.5l-3-1.8-3 1.8-3-1.8-3 1.8V3Z" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c1.5-4 4.5-6 7-6s5.5 2 7 6" />
    </svg>
  );
}

interface NavItem {
  screen: Screen;
  label: string;
  Icon: (props: { active: boolean }) => ReactNode;
  badge?: number;
  dot?: boolean;
}

/**
 * Persistent tab bar for the four top-level screens. Deliberately excluded
 * from "checkout" (see App.tsx) — that screen is a linear sub-flow reached
 * from Cart with its own back button and sticky "Place order" bar, and a
 * second bottom bar there would just compete for space and attention.
 */
export function BottomNav() {
  const screen = useUiStore((s) => s.screen);
  const goTo = useUiStore((s) => s.goTo);
  const activeOrderId = useUiStore((s) => s.activeOrderId);
  const itemCount = useCartStore((s) => s.itemCount());

  const items: NavItem[] = [
    { screen: "menu", label: t("navMenu"), Icon: MenuIcon },
    { screen: "cart", label: t("navCart"), Icon: CartIcon, badge: itemCount },
    { screen: "tracking", label: t("navOrder"), Icon: OrderIcon, dot: activeOrderId !== null },
    { screen: "profile", label: t("navProfile"), Icon: ProfileIcon },
  ];

  return (
    <nav
      className="flex shrink-0 items-stretch border-t border-stone-100 bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map(({ screen: target, label, Icon, badge, dot }) => {
        const active = screen === target;
        return (
          <button
            key={target}
            onClick={() => goTo(target)}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5"
          >
            <span className={active ? "text-brand" : "text-stone-400"}>
              <Icon active={active} />
            </span>
            <span className={`text-[11px] font-semibold ${active ? "text-brand" : "text-stone-400"}`}>{label}</span>
            {!!badge && (
              <span className="absolute right-[24%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                {badge}
              </span>
            )}
            {dot && !badge && (
              <span className="absolute right-[27%] top-1.5 h-2 w-2 rounded-full bg-brand" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
