"use client";
import React from "react";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import CourseCard from "../courses/CourseCard";
import SkeletonLoader from "../loading/SkeletonLoader";

/**
 * InstructorCoursesSlider Component
 * 
 * Displays a slider of courses by the same instructor(s).
 * Used in "Author More Courses" section.
 */
const InstructorCoursesSlider = ({ courses = [], isLoading = false }) => {
  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="sm:-mx-15px overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <SkeletonLoader key={i} type="card" className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  // Show message if no courses
  if (!courses || courses.length === 0) {
    return (
      <div className="sm:-mx-15px overflow-hidden">
        <p className="text-contentColor dark:text-contentColor-dark text-center py-8">
          No other courses available from this instructor.
        </p>
      </div>
    );
  }

  return (
    <Swiper
      direction="horizontal"
      slidesPerView={1}
      spaceBetween={15}
      grabCursor={true}
      autoplay={{
        delay: 5000,
        disableOnInteraction: false,
      }}
      loop={courses.length > 2}
      loopAdditionalSlides={2}
      loopedSlides={courses.length}
      breakpoints={{
        576: {
          slidesPerView: 2,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 2,
          spaceBetween: 20,
        },
        992: {
          slidesPerView: 2,
          spaceBetween: 20,
        },
        1500: {
          slidesPerView: 2,
          spaceBetween: 30,
        },
      }}
      navigation={false}
      modules={[Autoplay]}
      className="featured-courses"
    >
      {courses.map((course, idx) => (
        <SwiperSlide key={`course-${course.id}-${idx}`} style={{ height: 'auto', display: 'flex' }}>
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CourseCard type="primary" course={course} />
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default InstructorCoursesSlider;

