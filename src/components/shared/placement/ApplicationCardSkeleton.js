/**
 * Application Card Skeleton Component
 * 
 * Loading skeleton for application cards
 */

'use client';

export default function ApplicationCardSkeleton() {
  return (
    <div className="border-b dark:border-gray-700 pb-3 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        </div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
      </div>
    </div>
  );
}
