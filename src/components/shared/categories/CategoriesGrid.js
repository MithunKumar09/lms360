import CategoryCard from "./CategoryCard";
import CategoryCardSkeleton from "./CategoryCardSkeleton";
import { memo } from "react";

const CategoriesGrid = memo(({ categories, isLoading }) => {
  // Show skeleton loaders while loading
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {Array.from({ length: 8 }).map((_, idx) => (
          <CategoryCardSkeleton key={`skeleton-${idx}`} />
        ))}
      </div>
    );
  }

  // Show empty state if no categories
  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark text-lg">
          No categories available at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
});

CategoriesGrid.displayName = 'CategoriesGrid';

export default CategoriesGrid;

