"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProgramTypes } from "@/hooks/api/useCourseSettings";
import {
  useEnrolledCourses,
  useActiveCourses,
  useCompletedCourses,
} from "@/hooks/api/useStudentCourses";
import CourseCardSkeleton from "@/components/shared/courses/CourseCardSkeleton";
import NoData from "@/components/shared/others/NoData";
import coursePlaceholder from "@/assets/images/placeholder/courses.jpeg";

const StudentEnrolledCourses = () => {
  const router = useRouter();

  const [selectedProgramTypeId, setSelectedProgramTypeId] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const tabsRef = useRef(null);

  /* PROGRAM TYPES */
  const { data: programTypesData } = useProgramTypes({ status: 1 });

  /* COURSES */
  const { data: enrolledData, isLoading: loadingEnrolled } =
    useEnrolledCourses({ page: 1, limit: 50 });

  const { data: activeData, isLoading: loadingActive } =
    useActiveCourses({ page: 1, limit: 50 });

  const { data: completedData, isLoading: loadingCompleted } =
    useCompletedCourses({ page: 1, limit: 50 });

  const isLoading = loadingEnrolled || loadingActive || loadingCompleted;

  /* MERGE + FILTER */
  const courses = useMemo(() => {
    const merged = [
      ...(enrolledData?.courses || []),
      ...(activeData?.courses || []),
      ...(completedData?.courses || []),
    ];

    if (!selectedProgramTypeId) return merged;

    return merged.filter(
      (c) => c.programTypeId === selectedProgramTypeId
    );
  }, [enrolledData, activeData, completedData, selectedProgramTypeId]);

  /* TAB SCROLL INDICATOR LOGIC */
  const handleTabScroll = () => {
    const el = tabsRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    const percent = maxScroll > 0 ? el.scrollLeft / maxScroll : 0;
    setScrollProgress(percent);
  };

  return (
    <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark shadow-accordion rounded-2xl">

      {/* PROGRAM TYPE TABS */}
      <div
        ref={tabsRef}
        onScroll={handleTabScroll}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
      >
        <button
          onClick={() => setSelectedProgramTypeId(null)}
          className={`flex items-center gap-2 px-5 py-2 rounded-full border font-semibold transition whitespace-nowrap
            ${
              selectedProgramTypeId === null
                ? "bg-gradient-to-r from-[#2b0a3d] to-[#6a00f4] text-white"
                : "border-[#2b0a3d] text-[#2b0a3d]"
            }`}
        >
          Course
          <span className="bg-purple-200 text-purple-900 text-xs px-2 rounded-full">
            {courses.length}
          </span>
        </button>

        {programTypesData?.programTypes?.map((pt) => (
          <button
            key={pt.id}
            onClick={() => setSelectedProgramTypeId(pt.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-full border font-semibold transition whitespace-nowrap
              ${
                selectedProgramTypeId === pt.id
                  ? "bg-gradient-to-r from-[#2b0a3d] to-[#6a00f4] text-white"
                  : "border-[#2b0a3d] text-[#2b0a3d]"
              }`}
          >
            {pt.name}
            <span className="bg-purple-200 text-purple-900 text-xs px-2 rounded-full">
              {pt.courseCount || 0}
            </span>
          </button>
        ))}
      </div>

      {/* SCROLL INDICATOR (DYNAMIC) */}
      <div className="relative h-[3px] bg-gray-200 rounded-full my-5 overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-[#2b0a3d] rounded-full transition-transform duration-150"
          style={{
            width: "30%",
            transform: `translateX(${scrollProgress * 100}%)`,
          }}
        />
      </div>

      {/* COURSE GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <CourseCardSkeleton key={i} type="primaryMd" />
          ))
        ) : courses.length === 0 ? (
          <NoData message="No courses available" />
        ) : (
          courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-2xl shadow hover:shadow-lg transition overflow-hidden"
            >
              {/* IMAGE */}
<img
  src={
    typeof course.coverImageUrl === "string" &&
    course.coverImageUrl.trim() !== ""
      ? course.coverImageUrl
      : coursePlaceholder.src
  }
  alt={course.title}
  className="w-full h-[180px] object-cover"
  onError={(e) => {
    e.currentTarget.onerror = null; // prevent infinite loop
    e.currentTarget.src = coursePlaceholder.src;
  }}
/>

              <div className="p-4">
                <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                  {course.title}
                </h3>

                <p className="text-xs text-gray-500 mb-3">
                  👤 {course.instructors?.[0]?.name || "Instructor"}
                </p>

                {/* PROGRESS */}
                <div className="flex justify-between text-xs mb-1">
                  <span>{course.formattedLessonCount}</span>
                  <span className="text-purple-700 font-bold">
                    {Math.round(course.progress || 0)}%
                  </span>
                </div>

                <div className="h-1.5 bg-purple-100 rounded-full mb-3">
                  <div
                    className="h-full bg-purple-700 rounded-full"
                    style={{ width: `${course.progress || 0}%` }}
                  />
                </div>

                {/* META */}
                <div className="flex justify-between text-xs text-gray-500 mb-4">
                  <span>📘 {course.lesson}</span>
                  <span>
                    ⏱{" "}
                    {course.formattedDuration ||
                      course.duration ||
                      "—"}
                  </span>
                </div>

                {/* CONTINUE LEARNING */}
                <button
                  onClick={() =>
                    router.push(
                      `/course-details-3?courseId=${course.id}`
                    )
                  }
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-[#2b0a3d] to-[#6a00f4] text-white font-semibold"
                >
                  Continue Learning
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentEnrolledCourses;
