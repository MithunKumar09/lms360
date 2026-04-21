"use client";

import { useMemo } from "react";
import SectionNameSecondary from "@/components/shared/section-names/SectionNameSecondary";
import InstructorPrimary from "@/components/shared/instructors/InstructorPrimary";
import { useInstructors } from "@/hooks/api/useCourseFormData";
import { useAuthStore } from "@/store/index.js";
import teacherImag1 from "@/assets/images/teacher/teacher__1.png";
import teacherImag2 from "@/assets/images/teacher/teacher__2.png";
import teacherImag3 from "@/assets/images/teacher/teacher__3.png";
import teacherImag4 from "@/assets/images/teacher/teacher__4.png";
import teacherImag5 from "@/assets/images/teacher/teacher__5.png";
import teacherImag6 from "@/assets/images/teacher/teacher__6.png";
import teacherImagLg1 from "@/assets/images/team/1.png";
import teacherImagLg2 from "@/assets/images/team/2.png";
import teacherImagLg3 from "@/assets/images/team/3.png";
import teacherImagLg4 from "@/assets/images/team/4.png";
import teacherImagLg5 from "@/assets/images/team/5.png";
import teacherImagLg6 from "@/assets/images/team/6.png";

const InstructorsPrimary = () => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const userOrgId = user?.orgId;

  // Build params for API - use roles instead of role to get both instructor and orginstructor
  const params = useMemo(() => {
    const baseParams = {
      roles: 'instructor,orginstructor',
      status: 'active',
      page: 1,
      limit: 100, // Get more instructors for the list page
    };

    // For superadmin, allow optional organizationId filter (will be added later)
    // For other roles, server automatically filters by orgId
    return baseParams;
  }, []);

  const { data, isLoading, error } = useInstructors(params, {
    enabled: true,
  });

  // Map API response to component props
  const instructors = useMemo(() => {
    if (!data?.instructors) return [];

    return data.instructors.map((instructor, idx) => {
      const firstName = instructor.first_name || instructor.firstName || '';
      const lastName = instructor.last_name || instructor.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || instructor.email || 'Instructor';
      
      // Get designation from roles or default
      const designation = instructor.roles?.[0]?.title || 'Instructor';
      
      // Use avatar_url if available and valid, otherwise use default placeholder
      // Cycle through default images if no avatar
      const imageIndex = idx % 6;
      const defaultImages = [
        teacherImag1,
        teacherImag2,
        teacherImag3,
        teacherImag4,
        teacherImag5,
        teacherImag6,
      ];
      const defaultImagesLg = [
        teacherImagLg1,
        teacherImagLg2,
        teacherImagLg3,
        teacherImagLg4,
        teacherImagLg5,
        teacherImagLg6,
      ];

      // Check if avatar_url is a valid non-empty string
      const hasAvatarUrl = instructor.avatar_url && 
                          typeof instructor.avatar_url === 'string' && 
                          instructor.avatar_url.trim() !== '';

      return {
        id: instructor.id,
        name: fullName,
        desig: designation,
        image: hasAvatarUrl ? instructor.avatar_url : defaultImages[imageIndex],
        imageLg: hasAvatarUrl ? instructor.avatar_url : defaultImagesLg[imageIndex],
      };
    });
  }, [data?.instructors]);

  // Loading state with enhanced skeleton
  if (isLoading) {
    return (
      <section>
        <div className="container py-50px md:py-70px lg:py-20 2xl:py-100px overflow-hidden">
          <div data-aos="fade-up" className="text-center mb-45px">
            <SectionNameSecondary>EXPERT TEACHER</SectionNameSecondary>
            <h3 className="text-3xl md:text-size-35 lg:text-size-45 leading-10 md:leading-2xl font-bold text-blackColor dark:text-blackColor-dark">
              Our Expert Teacher
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-30px gap-y-15">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="group" data-aos="fade-up">
                <div className="mb-30px relative flex flex-col items-center">
                  {/* Circular image skeleton */}
                  <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                  {/* Decorative SVG skeleton */}
                  <div className="absolute transition-all duration-300 left-0 -top-3 opacity-0 w-full">
                    <div className="w-full h-80 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="text-center">
                  {/* Name skeleton */}
                  <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 mx-auto mb-2 rounded animate-pulse"></div>
                  {/* Designation skeleton */}
                  <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 mx-auto mb-3 rounded animate-pulse"></div>
                  {/* Social icons skeleton */}
                  <div className="flex gap-10px items-center justify-center">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-34px h-34px rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state with retry option
  if (error) {
    return (
      <section>
        <div className="container py-50px md:py-70px lg:py-20 2xl:py-100px overflow-hidden">
          <div data-aos="fade-up" className="text-center mb-45px">
            <SectionNameSecondary>EXPERT TEACHER</SectionNameSecondary>
            <h3 className="text-3xl md:text-size-35 lg:text-size-45 leading-10 md:leading-2xl font-bold text-blackColor dark:text-blackColor-dark">
              Our Expert Teacher
            </h3>
          </div>
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="mb-4">
                <i className="icofont-close-circled text-6xl text-red-500 dark:text-red-400"></i>
              </div>
              <h4 className="text-xl font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                Failed to Load Instructors
              </h4>
              <p className="text-contentColor dark:text-contentColor-dark mb-6">
                {error.message || "We couldn't load the instructors. Please check your connection and try again."}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-primaryColor text-whiteColor rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Empty state with enhanced messaging
  if (!instructors || instructors.length === 0) {
    return (
      <section>
        <div className="container py-50px md:py-70px lg:py-20 2xl:py-100px overflow-hidden">
          <div data-aos="fade-up" className="text-center mb-45px">
            <SectionNameSecondary>EXPERT TEACHER</SectionNameSecondary>
            <h3 className="text-3xl md:text-size-35 lg:text-size-45 leading-10 md:leading-2xl font-bold text-blackColor dark:text-blackColor-dark">
              Our Expert Teacher
            </h3>
          </div>
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="mb-4">
                <i className="icofont-teacher text-6xl text-gray-400 dark:text-gray-500"></i>
              </div>
              <h4 className="text-xl font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                No Instructors Available
              </h4>
              <p className="text-contentColor dark:text-contentColor-dark">
                There are no instructors to display at the moment. Please check back later.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="container py-50px md:py-70px lg:py-20 2xl:py-100px overflow-hidden">
        {/* heading */}
        <div data-aos="fade-up" className="text-center mb-45px">
          <SectionNameSecondary>EXPERT TEACHER</SectionNameSecondary>
          <h3 className="text-3xl md:text-size-35 lg:text-size-45 leading-10 md:leading-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Our Expert Teacher
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-30px gap-y-15">
          {instructors.map((instructor) => (
            <InstructorPrimary key={instructor.id} instructor={instructor} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default InstructorsPrimary;
