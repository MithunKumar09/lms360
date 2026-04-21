"use client";

import Link from "next/link";
import InstructorCoursesSlider from "./InstructorCoursesSlider";
import { useInstructorOtherCourses } from "@/hooks/api/useInstructorOtherCourses";

/**
 * InstrutorOtherCourses Component
 * 
 * Displays other courses by the same instructor(s) as the current course.
 * 
 * @param {Object} props
 * @param {Object} props.course - Current course object with instructors array
 * @param {string} props.courseId - Current course ID to exclude from results
 */
const InstrutorOtherCourses = ({ course, courseId }) => {
  // Extract instructor IDs from course
  const instructorIds = course?.instructors?.map(inst => inst.id).filter(Boolean) || [];
  const instructorIdsArray = Array.isArray(instructorIds) ? instructorIds : [];

  // Fetch other courses by the same instructor(s)
  const { data, isLoading } = useInstructorOtherCourses(
    instructorIdsArray,
    courseId,
    {
      enabled: instructorIdsArray.length > 0 && !!courseId,
    }
  );

  const otherCourses = data?.courses || [];

  // Don't render if no instructors or no other courses
  if (instructorIdsArray.length === 0) {
    return null;
  }

  return (
    <div className="mt-50px " data-aos="fade-up">
      {/* other courses heading  */}
      <div className="flex items-center justify-between mb-10px">
        <h4 className="text-3xl font-bold text-blackColor dark:text-blackColor-dark leading-1.2">
          Author More Courses
        </h4>
        {otherCourses.length > 0 && (
          <Link
            href="/courses"
            className="text-contentColor dark:text-contentColor-dark hover:text-primaryColor dark:hover:text-primaryColor-dark transition-colors"
          >
            More Courses...
          </Link>
        )}
      </div>
      <div data-aos="fade-up" className="sm:-mx-15px overflow-hidden">
        <InstructorCoursesSlider courses={otherCourses} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default InstrutorOtherCourses;
