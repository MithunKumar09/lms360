'use client';

import CourseDetails3Main from "@/components/layout/main/CourseDetails3Main";
import ThemeController from "@/components/shared/others/ThemeController";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import CourseAccessGuard from "@/components/shared/guards/CourseAccessGuard";
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import Aos from "aos";
import "aos/dist/aos.css";
import "@/assets/css/icofont.min.css";
import "sweetalert2/dist/sweetalert2.min.css";
import "./toast-styles.css";

const Course_Details_3_Content = () => {
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId');

  // Ensure AOS and other scripts are initialized after page load
  useEffect(() => {
    // Initialize AOS if not already initialized
    if (typeof window !== 'undefined') {
      Aos.init({
        offset: 1,
        duration: 1000,
        once: true,
        easing: "ease",
      });
      
      // Refresh AOS after a short delay to catch dynamically loaded content
      setTimeout(() => {
        Aos.refresh();
      }, 300);
      
      // Ensure AOS refreshes when content changes
      setTimeout(() => {
        Aos.refresh();
      }, 1000);
    }
  }, [courseId]);

  return (
    <PageWrapper>
      <main>
        <CourseAccessGuard courseId={courseId}>
          <CourseDetails3Main courseId={courseId} />
          <ThemeController />
        </CourseAccessGuard>
      </main>
    </PageWrapper>
  );
};

const Course_Details_3 = () => {
  return (
    <Suspense fallback={
      <PageWrapper>
        <main>
          <div className="container py-10 md:py-50px lg:py-60px 2xl:py-100px">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        </main>
      </PageWrapper>
    }>
      <Course_Details_3_Content />
    </Suspense>
  );
};

export default Course_Details_3;
