"use client";
import React, { useMemo } from "react";
import { Autoplay, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import useIsTrue from "@/hooks/useIsTrue";
import { usePathname } from "next/navigation";
import getAllCourses from "@/libs/getAllCourses";
import CourseCard from "../courses/CourseCard";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";

const FeaturedSlider = ({ instructorId }) => {
  const allCourses = getAllCourses();
  const path = usePathname();
  const id = path?.split("/")[2];
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  const isHome9 = useIsTrue("/home-9");
  const isHome9Dark = useIsTrue("/home-9-dark");
  const isHome10 = useIsTrue("/home-10");
  const isHome10Dark = useIsTrue("/home-10-dark");
  const isAbout = useIsTrue("/about");
  const isAboutDark = useIsTrue("/about-dark");
  let isCourseDetails = useIsTrue(`/courses/${id}`);
  let isCourseDetailsDark = useIsTrue(`/courses-dark/${id}`);
  const isCourseDetails2 = useIsTrue(`/course-details-2`);
  const isCourseDetails2Dark = useIsTrue(`/course-details-2-dark"`);
  const isCourseDetails3 = useIsTrue(`/course-details-3`);
  const isCourseDetails3Dark = useIsTrue(`/course-details-3-dark`);
  const isInstructorDetails = useIsTrue(`/instructors/${id}`);
  const isInstructorDetailsDark = useIsTrue(`/instructors-dark/${id}`);
  
  if (
    isCourseDetails2 ||
    isCourseDetails2Dark ||
    isCourseDetails3 ||
    isCourseDetails3Dark ||
    isInstructorDetails ||
    isInstructorDetailsDark
  ) {
    isCourseDetails = true;
  }

  // Fetch courses for instructor if instructorId is provided
  // Note: The API may not directly support filtering by specific instructor ID
  // For now, we'll fetch courses and the API will return courses based on current user's access
  // In the future, we may need to add a specific endpoint for instructor's courses
  const { data: instructorCoursesData, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['instructor-courses-detail', instructorId],
    queryFn: async () => {
      if (!instructorId) return { courses: [] };
      
      try {
        // Try to fetch courses - the API will filter based on current user's role
        // For instructor detail page, we want courses created by the viewed instructor
        // Since the API doesn't directly support this, we'll fetch accessible courses
        // and filter client-side if needed, or show all accessible courses
        const params = new URLSearchParams({
          limit: '20', // Get more courses to filter
          page: '1',
          status: 'published',
        });
        
        const response = await apiClient.get(`/courses?${params.toString()}`);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch courses');
        }
        
        // Filter courses created by this instructor
        // Handle both snake_case and camelCase field names
        const courses = (response.courses || []).filter(
          (course) => course.created_by === instructorId || course.createdBy === instructorId
        );
        
        return {
          courses: courses.slice(0, 6), // Limit to 6 courses
          total: courses.length,
        };
      } catch (error) {
        console.error('Error fetching instructor courses:', error);
        return { courses: [], total: 0 };
      }
    },
    enabled: isAuthenticated && !!instructorId && (isInstructorDetails || isInstructorDetailsDark),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  const commonCourses = allCourses
    .filter(({ featured }) => featured)
    .slice(6, 9);
  
  // Use instructor courses if available, otherwise use mock data
  const featuredCourses = useMemo(() => {
    // If on instructor details page and we have instructor courses, use those
    if ((isInstructorDetails || isInstructorDetailsDark) && instructorCoursesData?.courses) {
      return instructorCoursesData.courses.slice(0, 6);
    }
    
    // Otherwise use existing logic
    if (isHome9 || isHome9Dark) {
      return allCourses.filter(({ featured }) => featured).slice(9, 15);
    } else if (isHome10 || isHome10Dark || isInstructorDetails || isInstructorDetailsDark) {
      return allCourses.filter(({ featured }) => featured).slice(0, 6);
    }
    return [...commonCourses, ...commonCourses];
  }, [isHome9, isHome9Dark, isHome10, isHome10Dark, isInstructorDetails, isInstructorDetailsDark, instructorCoursesData, allCourses, commonCourses]);

  return (
    <Swiper
      direction="horizontal"
      slidesPerView={1}
      spaceBetween={15}
      grabCursor={true}
      autoplay={
        isAbout || isAboutDark || isCourseDetails || isCourseDetailsDark
          ? {
              delay: 5000,
              disableOnInteraction: false,
            }
          : false
      }
      loop={
        isAbout || isAboutDark || isCourseDetails || isCourseDetailsDark
          ? true
          : false
      }
      loopAdditionalSlides={2}
      loopedSlides={featuredCourses.length}
      breakpoints={{
        576: {
          slidesPerView: isCourseDetails || isCourseDetailsDark ? 2 : 1,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 2,
          spaceBetween: 20,
        },
        992: {
          slidesPerView: isCourseDetails || isCourseDetailsDark ? 2 : 3,
          spaceBetween: 20,
        },
        1500: {
          slidesPerView:
            isAbout || isAboutDark
              ? 3
              : isCourseDetails || isCourseDetailsDark
              ? 2
              : 4,
          spaceBetween: 30,
        },
      }}
      navigation={
        isAbout || isAboutDark || isCourseDetails || isCourseDetailsDark
          ? false
          : true
      }
      modules={[Autoplay, Navigation]}
      className="featured-courses"
    >
      {isLoadingCourses && (isInstructorDetails || isInstructorDetailsDark) ? (
        <SwiperSlide>
          <div className="text-center py-20 px-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primaryColor mb-4"></div>
            <p className="text-contentColor dark:text-contentColor-dark">Loading courses...</p>
          </div>
        </SwiperSlide>
      ) : featuredCourses && featuredCourses.length > 0 ? (
        featuredCourses.map((course, idx) => (
          <SwiperSlide key={`course-${course.id}-${idx}`} style={{ height: 'auto', display: 'flex' }}>
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CourseCard type="primary" course={course} />
            </div>
          </SwiperSlide>
        ))
      ) : (isInstructorDetails || isInstructorDetailsDark) ? (
        <SwiperSlide>
          <div className="text-center py-20 px-4">
            <div className="mb-4">
              <i className="icofont-book text-5xl text-gray-400 dark:text-gray-500"></i>
            </div>
            <h4 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              No Courses Available
            </h4>
            <p className="text-sm text-contentColor dark:text-contentColor-dark">
              This instructor hasn&apos;t created any courses yet.
            </p>
          </div>
        </SwiperSlide>
      ) : (
        featuredCourses.map((course, idx) => (
          <SwiperSlide key={`course-${course.id}-${idx}`} style={{ height: 'auto', display: 'flex' }}>
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CourseCard type="primary" course={course} />
            </div>
          </SwiperSlide>
        ))
      )}
    </Swiper>
  );
};

export default FeaturedSlider;
