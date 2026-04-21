/**
 * Free Course Enrollment Modal
 * 
 * Displays an attractive confirmation modal for enrolling in free courses
 */

"use client";
import React, { useEffect, useRef } from "react";
import { useEnrollCourse } from "@/hooks/api/useEnrollment";
import { useRouter } from "next/navigation";
import Image from "next/image";

const FreeCourseEnrollmentModal = ({ isOpen, onClose, course }) => {
  const router = useRouter();
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const enrollMutation = useEnrollCourse();
  const lastScrollTopRef = useRef(0);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  // Handle enrollment
  const handleEnroll = async () => {
    if (!course?.id) return;

    try {
      const result = await enrollMutation.mutateAsync({ courseId: course.id });
      
      if (result.success && result.firstLessonId) {
        // Navigate to first lesson
        router.push(`/lessons/1?courseId=${course.id}&lessonId=${result.firstLessonId}`);
      } else if (result.success) {
        // If no lesson, just close and refresh
        onClose();
        window.location.reload();
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      // Error will be shown via mutation state
    }
  };

  // Prevent body scroll when modal is open and handle navbar collapse on scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      const stickyHeader = document.querySelector('.sticky-header');
      if (!stickyHeader) return;

      const handleScroll = (e) => {
        const currentScrollTop = e.target.scrollTop;
        const scrollDifference = currentScrollTop - lastScrollTopRef.current;
        
        // Only hide/show if scroll is significant (more than 5px)
        if (Math.abs(scrollDifference) > 5) {
          if (scrollDifference > 0) {
            // Scrolling down - hide navbar
            stickyHeader.style.transform = 'translateY(-100%)';
            stickyHeader.style.transition = 'transform 0.3s ease-in-out';
          } else {
            // Scrolling up - show navbar
            stickyHeader.style.transform = 'translateY(0)';
            stickyHeader.style.transition = 'transform 0.3s ease-in-out';
          }
          lastScrollTopRef.current = currentScrollTop;
        }
      };

      const contentElement = contentRef.current;
      if (contentElement) {
        lastScrollTopRef.current = contentElement.scrollTop;
        contentElement.addEventListener('scroll', handleScroll);
        
        return () => {
          contentElement.removeEventListener('scroll', handleScroll);
          // Reset navbar position when modal closes
          if (stickyHeader) {
            stickyHeader.style.transform = '';
            stickyHeader.style.transition = '';
          }
        };
      }
    } else {
      document.body.style.overflow = 'unset';
      // Reset navbar position when modal closes
      const stickyHeader = document.querySelector('.sticky-header');
      if (stickyHeader) {
        stickyHeader.style.transform = '';
        stickyHeader.style.transition = '';
      }
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !course) return null;

  const courseImage = course.thumbnailUrl || course.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect fill='%23e5e7eb' width='400' height='225'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='24' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ECourse Image%3C/text%3E%3C/svg%3E";

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-300"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' : 'hidden',
      }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="free-enrollment-modal-title"
    >
      <div
        ref={contentRef}
        className="relative z-10 w-full max-w-md bg-whiteColor dark:bg-whiteColor-dark rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark opacity-70 hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-lightGrey5 dark:hover:bg-darkdeep1"
          aria-label="Close modal"
          disabled={enrollMutation.isPending}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            className="w-5 h-5 fill-current"
          >
            <path d="M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z"></path>
          </svg>
        </button>

        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-primaryColor to-primaryColor/90 dark:from-primaryColor dark:to-primaryColor/80 px-6 py-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 bg-whiteColor rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-whiteColor rounded-full translate-x-1/2 translate-y-1/2"></div>
          </div>
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-4 bg-whiteColor/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <i className="icofont-check-circled text-4xl text-whiteColor"></i>
            </div>
            <h2
              id="free-enrollment-modal-title"
              className="text-2xl font-bold text-whiteColor mb-2"
            >
              Enroll in Free Course
            </h2>
            <p className="text-whiteColor/90 text-sm">
              Start learning today at no cost!
            </p>
          </div>
        </div>

        {/* Course Details */}
        <div className="p-6">
          <div className="mb-6">
            <div className="relative w-full h-40 rounded-lg overflow-hidden mb-4 bg-lightGrey5 dark:bg-darkdeep1">
              <Image
                src={courseImage}
                alt={course.title || "Course"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
              />
            </div>
            <h3 className="text-xl font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              {course.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-contentColor dark:text-contentColor-dark">
              {course.formattedLessonCount || course.lesson ? (
                <div className="flex items-center gap-1">
                  <i className="icofont-book-alt text-primaryColor"></i>
                  <span>{course.formattedLessonCount || course.lesson}</span>
                </div>
              ) : null}
              {course.formattedDuration || course.duration ? (
                <div className="flex items-center gap-1">
                  <i className="icofont-clock-time text-primaryColor"></i>
                  <span>{course.formattedDuration || course.duration}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blackColor dark:text-blackColor-dark mb-3 flex items-center gap-2">
              <i className="icofont-star text-primaryColor"></i>
              What you&apos;ll get:
            </h4>
            <ul className="space-y-2 text-sm text-contentColor dark:text-contentColor-dark">
              <li className="flex items-start gap-2">
                <i className="icofont-check text-greencolor mt-0.5"></i>
                <span>Full access to all course materials</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="icofont-check text-greencolor mt-0.5"></i>
                <span>Lifetime access to course content</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="icofont-check text-greencolor mt-0.5"></i>
                <span>Certificate upon completion</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="icofont-check text-greencolor mt-0.5"></i>
                <span>Learn at your own pace</span>
              </li>
            </ul>
          </div>

          {/* Error Message */}
          {enrollMutation.isError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                {enrollMutation.error?.message || 'Failed to enroll. Please try again.'}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-lightGrey5 dark:bg-darkdeep1 rounded-lg hover:bg-lightGrey6 dark:hover:bg-darkdeep2 transition-colors"
              disabled={enrollMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEnroll}
              disabled={enrollMutation.isPending}
              className="flex-1 px-4 py-3 text-sm font-semibold text-whiteColor bg-primaryColor rounded-lg hover:bg-primaryColor/90 transition-all duration-300 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {enrollMutation.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-whiteColor" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enrolling...
                </>
              ) : (
                <>
                  <i className="icofont-check"></i>
                  Confirm Enrollment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreeCourseEnrollmentModal;

