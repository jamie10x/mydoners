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
    const name = prompt("Category name", category.name);
    if (!name || name === category.name) return;
    await api.patch(`/admin/categories/${category.id}`, { name });
    reload();
  }

  async function handleDelete(category: AdminCategory) {
    if (!confirm(`Delete "${category.name}"? Products in it will need a new category first.`)) return;
    await api.delete(`/admin/categories/${category.id}`);
    reload();
  }

  if (loading) return <p className="text-black/40">Loading…</p>;

  return (
    <div className="max-w-xl">
      <div className="mb-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="New category name"
          className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        <button onClick={handleAdd} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
          Add
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between rounded-lg border border-black/5 bg-white px-4 py-3"
          >
            <span className="font-medium">{category.name}</span>
            <div className="flex gap-3 text-sm">
              <button onClick={() => handleRename(category)} className="text-black/50 hover:text-black">
                Rename
              </button>
              <button onClick={() => handleDelete(category)} className="text-red-600 hover:text-red-800">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
