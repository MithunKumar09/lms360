//src/components/shared/courses/CourseCardSkeleton.js
/**
 * CourseCardSkeleton Component
 * 
 * Professional skeleton loader for course cards that matches the actual CourseCard layout.
 * Provides better UX during loading states.
 */

"use client";
import { memo } from "react";

const CourseCardSkeleton = memo(({ type = "primaryMd" }) => {
  return (
    <div
      className={`group w-full ${type === "primary" ? "w-[300px] flex-shrink-0" : type === "primaryMd" ? "" : `w-full sm:w-1/2 lg:w-1/3 grid-item ${
        type === "lg" ? "xl:w-1/4" : ""
      }`}`}
    >
      <div className={`w-full ${type === "primary" ? "h-full w-full" : type === "primaryMd" ? "" : "sm:px-15px mb-30px"}`}>
        <div className={`w-full p-15px bg-whiteColor shadow-brand dark:bg-darkdeep3-dark dark:shadow-brand-dark rounded ${type === "primary" ? "h-full w-full aspect-[9/16] flex flex-col" : ""}`}>
          {/* Card Image Skeleton */}
          <div className="relative mb-2 aspect-video w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700 animate-pulse">
            <div className="absolute left-0 top-1 flex justify-between w-full items-center px-2">
              {/* Category Badge Skeleton */}
              <div className="h-6 w-20 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
              {/* Wishlist Button Skeleton */}
              <div className="h-7 w-7 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Card Content Skeleton */}
          <div className="flex-1 flex flex-col">
            {/* Title Skeleton */}
            <div className="mb-2">
              <div className="h-5 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>

            {/* Meta Info Skeleton */}
            <div className="flex gap-15px mb-15px">
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
            <div className="flex items-center gap-2 mb-15px">
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>

            {/* Price Skeleton */}
            <div className="mt-auto pt-15px border-t border-borderColor dark:border-borderColor-dark">
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CourseCardSkeleton.displayName = 'CourseCardSkeleton';

export default CourseCardSkeleton;



