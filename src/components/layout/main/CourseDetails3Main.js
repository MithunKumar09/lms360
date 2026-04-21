'use client';

import CourseDetailsPrimary from "@/components/sections/course-details/CourseDetailsPrimary";
import HeroPrimary2 from "@/components/sections/hero-banners/HeroPrimary2";
import { useCourseDetails } from "@/hooks/api/useCourseDetails";
import React, { useEffect } from "react";
import Aos from "aos";

const CourseDetails3Main = ({ courseId }) => {
  const { data: course, isLoading } = useCourseDetails(courseId);

  // Refresh AOS animations when content loads
  useEffect(() => {
    if (!isLoading && course) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        Aos.refresh();
      }, 100);
    }
  }, [course, isLoading]);

  return (
    <>
      <HeroPrimary2 type={3} course={course} />
      <CourseDetailsPrimary type={3} courseId={courseId} />
    </>
  );
};

export default CourseDetails3Main;
