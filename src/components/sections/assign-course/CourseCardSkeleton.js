/**
 * Course Card Skeleton Component
 * 
 * Loading skeleton for course cards.
 */

'use client';

import SkeletonLoader from '@/components/shared/loading/SkeletonLoader';

const CourseCardSkeleton = () => {
  return (
    <div className="border border-borderColor dark:border-borderColor-dark rounded-lg overflow-hidden bg-whiteColor dark:bg-whiteColor-dark shadow-sm animate-pulse">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-3">
            <SkeletonLoader type="text" className="h-6 w-3/4" />
            <div className="space-y-2">
              <SkeletonLoader type="text" className="h-4 w-full" />
              <SkeletonLoader type="text" className="h-4 w-5/6" />
              <SkeletonLoader type="text" className="h-4 w-4/6" />
            </div>
          </div>
          <div className="ml-4">
            <SkeletonLoader type="button" className="h-6 w-6 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCardSkeleton;

