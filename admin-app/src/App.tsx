import { useState } from "react";
import { useAuthStore } from "./store/authStore";
import { LoginPage } from "./pages/LoginPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { ProductsPage } from "./pages/ProductsPage";
import { DashboardPage } from "./pages/DashboardPage";

type Tab = "dashboard" | "categories" | "products";

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
              <p className="text-xs text-stone-400">Sales & menu management</p>
            </div>
          </div>
          <button
            onClick={clearToken}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6">
        <nav className="flex gap-2 pt-5">
          <button
            onClick={() => setTab("dashboard")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === "dashboard" ? "bg-brand text-white" : "bg-stone-200/70 text-stone-600"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setTab("products")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === "products" ? "bg-brand text-white" : "bg-stone-200/70 text-stone-600"
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setTab("categories")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === "categories" ? "bg-brand text-white" : "bg-stone-200/70 text-stone-600"
            }`}
          >
            Categories
          </button>
        </nav>

        <main className="py-6">
          {tab === "dashboard" ? <DashboardPage /> : tab === "products" ? <ProductsPage /> : <CategoriesPage />}
        </main>
      </div>
    </div>
  );
}
