import type { Category } from "@mydoners/shared-contracts";

interface CategoryTabsProps {
  categories: Category[];
  activeCategoryId: number | null;
  onSelect: (categoryId: number | null) => void;
}

export function CategoryTabs({ categories, activeCategoryId, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
          activeCategoryId === null ? "bg-brand text-white" : "bg-stone-200/70 text-stone-600"
        }`}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            activeCategoryId === category.id ? "bg-brand text-white" : "bg-stone-200/70 text-stone-600"
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
