"use client";
import { useEffect, useState } from "react";
import CourseCard from "./CourseCard";
import CourseCardSkeleton from "./CourseCardSkeleton";
import { useCoursesList } from "@/hooks/api/useCoursesList";
import { useAuthStore } from "@/store/index.js";

/**
 * Fisher-Yates shuffle algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const FilterCards = ({ type }) => {
  const [shuffledCourses, setShuffledCourses] = useState([]);

  // PATCH C: read hydration state as stable primitives so the query only fires
  // when the auth store is settled — either confirmed guest (no user) or
  // fully-hydrated authenticated user (role + id both present).
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const userRole = useAuthStore((state) => state.user?.role ?? null);
  const isStoreReady = !userId || (!!userRole && !!userId); // guest OR fully hydrated

  // Fetch public courses (org_id IS NULL) - fetch more to have enough for shuffling
  const { data: coursesData, isLoading, error } = useCoursesList(
    {
      page: 1,
      limit: 100, // Fetch more courses to ensure we have enough after filtering
      sortBy: "newest",
    },
    {
      enabled: isStoreReady, // fire only when store is settled (guest or authenticated)
    }
  );

  const allCourses = coursesData?.courses || [];

  // Filter courses by creator role (superadmin or vendor) and shuffle on every load
  useEffect(() => {
    if (allCourses.length > 0) {
      // Filter: Only courses created by superadmin or vendor
      const filteredCourses = allCourses.filter((course) => {
        const creatorRole = course.creatorRole;
        // Filter by creator role: superadmin or vendor
        // If creatorRole is null/undefined, exclude the course (strict filtering)
        return creatorRole === "superadmin" || creatorRole === "vendor";
      });

      // If no courses match the filter, use all courses as fallback (for development/debugging)
      // In production, you might want to show empty state instead
      const coursesToShuffle = filteredCourses.length > 0 ? filteredCourses : allCourses;

      // Shuffle the courses on every load
      const shuffled = shuffleArray(coursesToShuffle);

      // Limit to 6 courses (or 8 for lg type)
      const limit = type === "lg" ? 8 : 6;
      const limitedCourses = shuffled.slice(0, limit);

      setShuffledCourses(limitedCourses);
    } else if (!isLoading && allCourses.length === 0) {
      // Reset to empty array when courses are loaded but empty
      setShuffledCourses([]);
    }
  }, [allCourses, type, isLoading]);

  const filterOptions = [
    "filter1 filter3",
    "filter2 filter3",
    "filter4 filter5",
    "filter4",
    "filter1 filter3",
    "filter2 filter5",
    "filter4 filter5",
    "filter4",
  ];

  // Loading state
  if (isLoading) {
    const skeletonCount = type === "lg" ? 8 : 6;
    return (
      <div
        className={` filter-contents flex flex-wrap sm:-mx-15px box-content mt-7 lg:mt-25px`}
        data-aos="fade-up"
      >
        {Array.from({ length: skeletonCount }).map((_, idx) => (
          <CourseCardSkeleton key={`skeleton-${idx}`} type={type} />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={` filter-contents flex flex-wrap sm:-mx-15px box-content mt-7 lg:mt-25px`}
        data-aos="fade-up"
      >
        <div className="w-full text-center py-10">
          <p className="text-contentColor dark:text-contentColor-dark">
            Failed to load courses. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // No courses state - show empty state that maintains layout
  if (!isLoading && (!shuffledCourses || shuffledCourses.length === 0)) {
    return (
      <div
        className={` filter-contents flex flex-wrap sm:-mx-15px box-content mt-7 lg:mt-25px`}
        data-aos="fade-up"
      >
        <div className="w-full text-center py-10">
          <p className="text-contentColor dark:text-contentColor-dark text-sm">
            No courses available at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={` filter-contents flex flex-wrap sm:-mx-15px box-content mt-7 lg:mt-25px`}
      data-aos="fade-up"
    >
      {shuffledCourses.map((course, idx) => (
        <CourseCard
          key={course.id || idx}
          idx={idx}
          type={type}
          course={{
            ...course,
            filterOption: filterOptions[idx] || filterOptions[idx % filterOptions.length],
          }}
        />
      ))}
    </div>
  );
};

export default FilterCards;
