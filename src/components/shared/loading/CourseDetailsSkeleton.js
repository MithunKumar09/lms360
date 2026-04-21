/**
 * Course Details Skeleton Loader
 * 
 * Skeleton loader for course details page
 */

'use client';

import SkeletonLoader from './SkeletonLoader';

const CourseDetailsSkeleton = () => {
  return (
    <div className="space-y-[35px]">
      {/* Buttons and Last Update Skeleton */}
      <div className="flex items-center justify-between flex-wrap gap-6 mb-30px">
        <div className="flex items-center gap-6">
          <SkeletonLoader type="button" className="h-6 w-20" />
          <SkeletonLoader type="button" className="h-6 w-24" />
        </div>
        <SkeletonLoader type="text" className="h-4 w-32" />
      </div>

      {/* Title Skeleton */}
      <SkeletonLoader type="text" className="h-10 w-3/4 mb-4" />

      {/* Price, Lessons, Rating Skeleton */}
      <div className="flex gap-5 flex-wrap items-center mb-30px">
        <SkeletonLoader type="text" className="h-6 w-24" />
        <SkeletonLoader type="text" className="h-6 w-20" />
        <SkeletonLoader type="text" className="h-6 w-16" />
      </div>

      {/* Description Skeleton */}
      <div className="space-y-2 mb-25px">
        <SkeletonLoader type="text" className="h-4 w-full" />
        <SkeletonLoader type="text" className="h-4 w-full" />
        <SkeletonLoader type="text" className="h-4 w-3/4" />
      </div>

      {/* Course Details Grid Skeleton */}
      <div className="bg-darkdeep3 dark:bg-darkdeep3-dark mb-30px grid grid-cols-1 md:grid-cols-2">
        <div className="p-10px md:py-55px md:pl-50px md:pr-70px lg:py-35px lg:px-30px 2xl:py-55px 2xl:pl-50px 2xl:pr-70px border-r-2 border-borderColor dark:border-borderColor-dark space-y-[10px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <SkeletonLoader type="text" className="h-4 w-20" />
              <SkeletonLoader type="text" className="h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="p-10px md:py-55px md:pl-50px md:pr-70px lg:py-35px lg:px-30px 2xl:py-55px 2xl:pl-50px 2xl:pr-70px space-y-[10px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <SkeletonLoader type="text" className="h-4 w-20" />
              <SkeletonLoader type="text" className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CourseDetailsSkeleton;

