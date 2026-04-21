import React, { memo } from "react";
import CourseCard2 from "./CourseCard2";
import CourseListCardSkeleton from "./CourseListCardSkeleton";

const CoursesList = memo(({ courses, card, isList, isNotSidebar, enrollmentStatusMap }) => {
  // Check if courses are skeleton placeholders
  const isSkeleton = courses?.[0]?.id?.toString().startsWith('skeleton-');

  return (
    <div className="flex flex-col gap-30px">
      {courses?.length ? (
        courses?.map((course, idx) => {
          if (isSkeleton) {
            return <CourseListCardSkeleton key={idx} />;
          }
          return (
            <CourseCard2
              key={course.id || idx}
              course={course}
              isList={isList}
              card={card}
              isNotSidebar={isNotSidebar}
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

CoursesList.displayName = 'CoursesList';

export default CoursesList;
