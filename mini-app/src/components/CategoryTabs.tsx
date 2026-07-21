import type { Category } from "@mydoners/shared-contracts";

interface CategoryTabsProps {
  categories: Category[];
  activeCategoryId: number | null;
  onSelect: (categoryId: number | null) => void;
}

export function CategoryTabs({ categories, activeCategoryId, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
          activeCategoryId === null ? "bg-brand text-white" : "bg-black/5 text-black/70"
        }`}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
            activeCategoryId === category.id ? "bg-brand text-white" : "bg-black/5 text-black/70"
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
