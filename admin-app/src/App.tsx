import { useState } from "react";
import { useAuthStore } from "./store/authStore";
import { LoginPage } from "./pages/LoginPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { ProductsPage } from "./pages/ProductsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CustomersPage } from "./pages/CustomersPage";

type Tab = "dashboard" | "customers" | "categories" | "products";

function tabClass(active: boolean): string {
  return `rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
    active ? "bg-brand text-white" : "bg-stone-200/70 text-stone-600"
  }`;
}

export function App() {
  const token = useAuthStore((s) => s.token);
  const clearToken = useAuthStore((s) => s.clearToken);
  const [tab, setTab] = useState<Tab>("dashboard");

  if (!token) return <LoginPage />;

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="" className="h-9 w-9 rounded-lg" />
            <div>
              <h1 className="text-base font-extrabold leading-tight text-stone-900">MyDoners Admin</h1>
              <p className="text-xs text-stone-400">Savdo va menyu boshqaruvi</p>
            </div>
          </div>
          <button
            onClick={clearToken}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900"
          >
            Chiqish
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6">
        <nav className="flex gap-2 pt-5">
          <button onClick={() => setTab("dashboard")} className={tabClass(tab === "dashboard")}>
            Statistika
          </button>
          <button onClick={() => setTab("customers")} className={tabClass(tab === "customers")}>
            Mijozlar
          </button>
          <button onClick={() => setTab("products")} className={tabClass(tab === "products")}>
            Mahsulotlar
          </button>
          <button onClick={() => setTab("categories")} className={tabClass(tab === "categories")}>
            Kategoriyalar
          </button>
        </nav>

        <main className="py-6">
          {tab === "dashboard" && <DashboardPage />}
          {tab === "customers" && <CustomersPage />}
          {tab === "products" && <ProductsPage />}
          {tab === "categories" && <CategoriesPage />}
        </main>
      </div>
    </div>
  );
}
