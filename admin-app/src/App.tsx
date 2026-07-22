import { useState } from "react";
import { useAuthStore } from "./store/authStore";
import { LoginPage } from "./pages/LoginPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { ProductsPage } from "./pages/ProductsPage";

type Tab = "categories" | "products";

export function App() {
  const token = useAuthStore((s) => s.token);
  const clearToken = useAuthStore((s) => s.clearToken);
  const [tab, setTab] = useState<Tab>("products");

  if (!token) return <LoginPage />;

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-black/5 bg-white px-6 py-4">
        <h1 className="text-lg font-bold">MyDoners Admin</h1>
        <button onClick={clearToken} className="text-sm text-black/50 hover:text-black">
          Sign out
        </button>
      </header>

      <nav className="flex gap-2 px-6 pt-4">
        <button
          onClick={() => setTab("products")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === "products" ? "bg-brand text-white" : "bg-black/5"}`}
        >
          Products
        </button>
        <button
          onClick={() => setTab("categories")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === "categories" ? "bg-brand text-white" : "bg-black/5"}`}
        >
          Categories
        </button>
      </nav>

      <main className="p-6">{tab === "products" ? <ProductsPage /> : <CategoriesPage />}</main>
    </div>
  );
}
