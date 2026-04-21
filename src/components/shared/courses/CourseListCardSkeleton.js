/**
 * CourseListCardSkeleton Component
 * 
 * Professional skeleton loader for course list cards that matches the actual CourseCard2 layout.
 * Provides better UX during loading states in list view.
 */

"use client";
import { memo } from "react";

const CourseListCardSkeleton = memo(() => {
  return (
    <div className="p-15px bg-whiteColor shadow-brand dark:bg-darkdeep3-dark dark:shadow-brand-dark mb-30px rounded">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Image Skeleton */}
        <div className="relative w-full md:w-80 h-48 md:h-40 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden animate-pulse">
          <div className="absolute left-0 top-1 flex justify-between w-full items-center px-2">
            <div className="h-6 w-20 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
            <div className="h-7 w-7 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 flex flex-col">
          {/* Title Skeleton */}
          <div className="mb-3">
            <div className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-6 w-4/5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>

          {/* Meta Info Skeleton */}
          <div className="flex flex-wrap gap-4 mb-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Instructor Skeleton */}
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>

          {/* Price and Button Skeleton */}
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-borderColor dark:border-borderColor-dark">
            <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
});

CourseListCardSkeleton.displayName = 'CourseListCardSkeleton';

export default CourseListCardSkeleton;



