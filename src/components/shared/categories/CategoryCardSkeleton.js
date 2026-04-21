/**
 * CategoryCardSkeleton Component
 * 
 * Professional skeleton loader for category cards that matches the actual CategoryCard layout.
 * Provides better UX during loading states.
 */

"use client";
import { memo } from "react";

const CategoryCardSkeleton = memo(() => {
  return (
    <div className="group block w-full">
      <div className="relative aspect-square w-full rounded-lg bg-whiteColor shadow-brand dark:bg-darkdeep3-dark dark:shadow-brand-dark overflow-hidden">
        {/* Image Container with padding */}
        <div className="relative w-full h-full p-2">
          <div className="relative w-full h-full overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse">
            {/* Overlay gradient skeleton */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-400/50 via-gray-300/30 to-transparent" />
          </div>
        </div>
        
        {/* Category Name Skeleton */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-400/80 to-transparent pointer-events-none">
          <div className="h-6 w-3/4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-1/2 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
});

CategoryCardSkeleton.displayName = 'CategoryCardSkeleton';

export default CategoryCardSkeleton;

