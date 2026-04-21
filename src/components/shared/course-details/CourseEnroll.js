"use client";
import Image from "next/image";
import PopupVideo from "../popup/PopupVideo";
import blogImage7 from "@/assets/images/blog/blog_7.png";
import { useCartContext } from "@/contexts/CartContext";
import { formatDateShort } from "@/lib/utils/dateFormatter";
import { formatDuration } from "@/lib/utils/durationFormatter";
import { useCheckEnrollment } from "@/hooks/api/useEnrollment";
import PaidCourseEnrollmentModal from "@/components/shared/modals/PaidCourseEnrollmentModal";
import FreeCourseEnrollmentModal from "@/components/shared/modals/FreeCourseEnrollmentModal";
import { useAuthStore } from "@/store/index.js";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CourseEnroll = ({ type, course }) => {
  const router = useRouter();
  const { addProductToCart } = useCartContext();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userRole = user?.role || null;
  const courseId = course?.id;
  
  // Check if user role can enroll
  const allowedRoles = ['student', 'alumni'];
  const isStudent = allowedRoles.includes(userRole);
  
  // Enrollment status check
  const { data: enrollmentData, isLoading: isLoadingEnrollment } = useCheckEnrollment(courseId, {
    enabled: isStudent && isAuthenticated && !!courseId,
  });
  
  const isEnrolled = enrollmentData?.isEnrolled || false;
  const firstLessonId = enrollmentData?.firstLessonId || null;
  
  // Modal state
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);

  // Check if course is free
  const courseTypeName = course?.courseTypeName || course?.courseType?.name || '';
  const isFree = courseTypeName.toLowerCase() === 'free' || 
                 (course?.regularPrice === 0 && course?.discountedPrice === 0);

  // Get price (use discounted price if available, otherwise regular price)
  const displayPrice = course?.discountedPrice > 0 
    ? course.discountedPrice 
    : (course?.regularPrice > 0 ? course.regularPrice : 0);
  
  const regularPrice = course?.regularPrice || 0;

  // Calculate discount percentage
  const calculateDiscount = () => {
    if (!regularPrice || regularPrice === 0 || displayPrice >= regularPrice) return 0;
    return Math.round(((regularPrice - displayPrice) / regularPrice) * 100);
  };
  const discountPercentage = calculateDiscount();

  // Get instructor name (first instructor or fallback)
  const instructorName = course?.instructors && course.instructors.length > 0
    ? course.instructors[0].name || '--'
    : '--';

  // Format start date
  const startDate = course?.startDate 
    ? formatDateShort(course.startDate)
    : '--';

  // Calculate total duration from modules (in minutes, then format)
  const calculateTotalDuration = () => {
    if (!course?.modules || course.modules.length === 0) return 0;
    let totalMinutes = 0;
    course.modules.forEach(module => {
      if (module.chapters) {
        module.chapters.forEach(chapter => {
          if (chapter.lessons) {
            chapter.lessons.forEach(lesson => {
              totalMinutes += lesson.duration || 0;
            });
          }
        });
      }
    });
    return totalMinutes;
  };
  const totalDurationMinutes = calculateTotalDuration();
  const formattedDuration = formatDuration(totalDurationMinutes);

  // Get enrolled count
  const enrolledCount = course?.enrolledCount || 0;

  // Get total lessons count
  const totalLessons = course?.totalLessons || 0;

  // Get course level
  const courseLevel = course?.courseLevelName || course?.courseLevel?.name || '--';

  // Get language
  const language = course?.language || '--';

  // Get course status
  const courseStatus = course?.status || '--';

  // Handle null/undefined with "--"
  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return '--';
    return value;
  };

  // Handle start course (navigate to first lesson)
  const handleStartCourse = () => {
    if (firstLessonId && courseId) {
      router.push(`/lessons/1?courseId=${courseId}&lessonId=${firstLessonId}`);
    }
  };
  
  // Handle pay now (open enrollment modal)
  const handlePayNow = () => {
    setShowEnrollmentModal(true);
  };
  
  // Handle enroll now for free courses
  const handleEnrollNow = () => {
    setShowEnrollmentModal(true);
  };

  return (
    <div
      className="py-33px px-25px shadow-event mb-30px bg-whiteColor dark:bg-whiteColor-dark rounded-md"
      data-aos="fade-up"
    >
      {type === 3 ? (
        ""
      ) : (
        <div className="overflow-hidden relative mb-5">
          <Image 
            src={blogImage7} 
            alt={course?.title || "Course"} 
            className="w-full" 
            width={400}
            height={250}
            placeholder="blur"
          />
          <div className="absolute top-0 right-0 left-0 bottom-0 flex items-center justify-center z-10">
            <PopupVideo />
          </div>
        </div>
      )}

      {/* Price Section - Only show if not free */}
      {!isFree && (
        <div
          className={`flex justify-between ${
            type === 2 ? "mt-50px mb-5" : type === 3 ? "mb-50px" : "mb-5"
          }`}
        >
          <div className="text-size-21 font-bold text-primaryColor font-inter leading-25px">
            ${displayPrice.toFixed(2)}
            {regularPrice > displayPrice && (
              <del className="text-sm text-lightGrey4 font-semibold">/ ${regularPrice.toFixed(2)}</del>
            )}
          </div>
          {discountPercentage > 0 && (
            <div>
              <a
                href="#"
                className="uppercase text-sm font-semibold text-secondaryColor2 leading-27px px-2 bg-whitegrey1 dark:bg-whitegrey1-dark"
              >
                {discountPercentage}% OFF
              </a>
            </div>
          )}
        </div>
      )}

      {/* Free Course Badge */}
      {isFree && (
        <div className="mb-5 text-center">
          <span className="inline-block px-25px py-10px bg-green-500 text-whiteColor text-size-15 font-semibold rounded">
            Free Course
          </span>
        </div>
      )}

      {/* Enrollment Modals */}
      {isFree ? (
        <FreeCourseEnrollmentModal
          isOpen={showEnrollmentModal}
          onClose={() => setShowEnrollmentModal(false)}
          course={course}
        />
      ) : (
        <PaidCourseEnrollmentModal
          isOpen={showEnrollmentModal}
          onClose={() => setShowEnrollmentModal(false)}
          course={course}
        />
      )}

      {/* Action Buttons */}
      {isStudent && isAuthenticated ? (
        <div className="mb-5" data-aos="fade-up">
          {isLoadingEnrollment ? (
            <button
              disabled
              className="w-full text-size-15 text-whiteColor bg-lightGrey5 px-25px py-10px border mb-10px leading-1.8 border-lightGrey5 inline-block rounded cursor-not-allowed opacity-70"
            >
              Loading...
            </button>
          ) : isEnrolled ? (
            <>
              <button
                onClick={handleStartCourse}
                className="w-full text-size-15 text-whiteColor bg-greencolor px-25px py-10px border mb-10px leading-1.8 border-greencolor hover:bg-greencolor/90 inline-block rounded group"
              >
                Start Course
              </button>
            </>
          ) : isFree ? (
            <>
              <button
                onClick={handleEnrollNow}
                className="w-full text-size-15 text-whiteColor bg-primaryColor px-25px py-10px border mb-10px leading-1.8 border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark"
              >
                Enroll Now
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handlePayNow}
                className="w-full text-size-15 text-whiteColor bg-primaryColor px-25px py-10px border mb-10px leading-1.8 border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark"
              >
                Pay Now
              </button>
              <span className="text-size-13 text-contentColor dark:text-contentColor-dark leading-1.8">
                <i className="icofont-ui-rotation"></i> 45-Days Money-Back Guarantee
              </span>
            </>
          )}
        </div>
      ) : !isFree && (
        <div className="mb-5" data-aos="fade-up">
          <button
            onClick={handlePayNow}
            className="w-full text-size-15 text-whiteColor bg-primaryColor px-25px py-10px border mb-10px leading-1.8 border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark"
          >
            Pay Now
          </button>
          <span className="text-size-13 text-contentColor dark:text-contentColor-dark leading-1.8">
            <i className="icofont-ui-rotation"></i> 45-Days Money-Back Guarantee
          </span>
        </div>
      )}

      {/* Course Details List */}
      <ul>
        <li className="flex items-center justify-between py-10px border-b border-borderColor dark:border-borderColor-dark">
          <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark leading-1.8">
            Instructor:
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark px-10px py-6px bg-borderColor dark:bg-borderColor-dark rounded-full leading-13px">
            {formatValue(instructorName)}
          </p>
        </li>
        <li className="flex items-center justify-between py-10px border-b border-borderColor dark:border-borderColor-dark">
          <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark leading-1.8">
            Lectures:
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark px-10px py-6px bg-borderColor dark:bg-borderColor-dark rounded-full leading-13px">
            {formatValue(totalLessons > 0 ? totalLessons : '--')}
          </p>
        </li>
        <li className="flex items-center justify-between py-10px border-b border-borderColor dark:border-borderColor-dark">
          <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark leading-1.8">
            Total Duration:
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark px-10px py-6px bg-borderColor dark:bg-borderColor-dark rounded-full leading-13px">
            {formatValue(formattedDuration || '--')}
          </p>
        </li>
        <li className="flex items-center justify-between py-10px border-b border-borderColor dark:border-borderColor-dark">
          <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark leading-1.8">
            Enrolled:
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark px-10px py-6px bg-borderColor dark:bg-borderColor-dark rounded-full leading-13px">
            {formatValue(enrolledCount > 0 ? enrolledCount : '--')}
          </p>
        </li>
        <li className="flex items-center justify-between py-10px border-b border-borderColor dark:border-borderColor-dark">
          <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark leading-1.8">
            Total Students:
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark px-10px py-6px bg-borderColor dark:bg-borderColor-dark rounded-full leading-13px">
            {formatValue(enrolledCount > 0 ? enrolledCount : '--')}
          </p>
        </li>
        <li className="flex items-center justify-between py-10px border-b border-borderColor dark:border-borderColor-dark">
          <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark leading-1.8">
            Course Level:
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark px-10px py-6px bg-borderColor dark:bg-borderColor-dark rounded-full leading-13px">
            {formatValue(courseLevel)}
          </p>
        </li>
        <li className="flex items-center justify-between py-10px border-b border-borderColor dark:border-borderColor-dark">
          <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark leading-1.8">
            Language:
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark px-10px py-6px bg-borderColor dark:bg-borderColor-dark rounded-full leading-13px">
            {formatValue(language)}
          </p>
        </li>
        {!isFree && (
          <>
            <li className="flex items-center justify-between py-10px border-b border-borderColor dark:border-borderColor-dark">
              <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark leading-1.8">
                Price Discount:
              </p>
              <p className="text-xs text-contentColor dark:text-contentColor-dark px-10px py-6px bg-borderColor dark:bg-borderColor-dark rounded-full leading-13px">
                {formatValue(discountPercentage > 0 ? `${discountPercentage}%` : '--')}
              </p>
            </li>
            <li className="flex items-center justify-between py-10px border-b border-borderColor dark:border-borderColor-dark">
              <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark leading-1.8">
                Regular Price:
              </p>
              <p className="text-xs text-contentColor dark:text-contentColor-dark px-10px py-6px bg-borderColor dark:bg-borderColor-dark rounded-full leading-13px">
                {formatValue(regularPrice > 0 ? `$${regularPrice.toFixed(2)}` : '--')}
              </p>
            </li>
          </>
        )}
        <li className="flex items-center justify-between py-10px border-b border-borderColor dark:border-borderColor-dark">
          <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark leading-1.8">
            Course Status:
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark px-10px py-6px bg-borderColor dark:bg-borderColor-dark rounded-full leading-13px">
            {formatValue(courseStatus)}
          </p>
        </li>
      </ul>

      {/* Removed "More inquiry about course" section as per requirements */}
    </div>
  );
};

export default CourseEnroll;
