import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { AdminCategory } from "../api/types";

export function CategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");

  function reload() {
    setLoading(true);
    api
      .get<AdminCategory[]>("/admin/categories")
      .then(setCategories)
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function handleAdd() {
    if (!newName.trim()) return;
    await api.post("/admin/categories", { name: newName.trim(), displayOrder: categories.length + 1 });
    setNewName("");
    reload();
  }

  async function handleRename(category: AdminCategory) {
    const name = prompt("Kategoriya nomi", category.name);
    if (!name || name === category.name) return;
    await api.patch(`/admin/categories/${category.id}`, { name });
    reload();
  }

  async function handleDelete(category: AdminCategory) {
    if (!confirm(`"${category.name}"ni o'chirasizmi? Undagi mahsulotlarga avval boshqa kategoriya belgilash kerak bo'ladi.`)) return;
    await api.delete(`/admin/categories/${category.id}`);
    reload();
  }

  if (loading) {
    return (
      <div className="flex max-w-xl flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-stone-200/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <div className="mb-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Yangi kategoriya nomi"
          className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-base outline-none focus:border-brand"
        />
        <button
          onClick={handleAdd}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/20"
        >
          Qo'shish
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm"
          >
            <span className="font-semibold text-stone-900">{category.name}</span>
            <div className="flex gap-3 text-sm">
              <button onClick={() => handleRename(category)} className="font-medium text-stone-500 hover:text-stone-900">
                Nomini o'zgartirish
              </button>
              <button onClick={() => handleDelete(category)} className="font-medium text-red-600 hover:text-red-800">
                O'chirish
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
