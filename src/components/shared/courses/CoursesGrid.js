import CourseCard from "./CourseCard";
import CourseCardSkeleton from "./CourseCardSkeleton";
import { memo } from "react";

const CoursesGrid = memo(({ courses, isNotSidebar, enrollmentStatusMap }) => {
  // Check if courses are skeleton placeholders
  const isSkeleton = courses?.[0]?.id?.toString().startsWith('skeleton-');

  return (
    <div
      className={`grid grid-cols-1 ${
        isNotSidebar
          ? "sm:grid-cols-2 xl:grid-cols-3"
          : "sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
      }   gap-30px`}
    >
      {courses?.length ? (
        courses?.map((course, idx) => {
          if (isSkeleton) {
            return <CourseCardSkeleton key={idx} type="primaryMd" />;
          }
          return (
            <CourseCard 
              key={course.id || idx} 
              course={course} 
              type={"primaryMd"}
              enrollmentStatus={enrollmentStatusMap?.[course.id]}
            />
          );
        })
      ) : (
        <span></span>
      )}
    </div>
  );
});

CoursesGrid.displayName = 'CoursesGrid';

export default CoursesGrid;
