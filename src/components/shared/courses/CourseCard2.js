"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useState, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCategoryBadgeClass } from "@/lib/utils/courseUtils";
import { useToggleWishlist, useCheckWishlist } from "@/hooks/api/useWishlist";
import { useWishlistStore } from "@/store/index.js";
import { useAuthStore } from "@/store/index.js";
import { useCheckEnrollment } from "@/hooks/api/useEnrollment";
import LoginModal from "@/components/shared/modals/LoginModal";
import FreeCourseEnrollmentModal from "@/components/shared/modals/FreeCourseEnrollmentModal";
import PaidCourseEnrollmentModal from "@/components/shared/modals/PaidCourseEnrollmentModal";

const CourseCard2 = memo(({ course, card, isList, isNotSidebar, enrollmentStatus }) => {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;
  const toggleWishlist = useToggleWishlist();
  const courseId = course?.id || course?.courseId;
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);

  // Check if user role can see "Enroll Now" button
  const allowedRoles = ['student', 'alumni'];
  const canShowEnrollButton = allowedRoles.includes(userRole);

  // Check enrollment status - use prop if provided, otherwise use hook
  const { data: enrollmentDataFromHook, isLoading: isLoadingEnrollmentFromHook } = useCheckEnrollment(courseId, {
    enabled: !enrollmentStatus && canShowEnrollButton && isAuthenticated && !!courseId,
  });

  // Use enrollmentStatus prop if provided, otherwise use hook data
  const isEnrolled = enrollmentStatus?.isEnrolled ?? enrollmentDataFromHook?.isEnrolled ?? false;
  const firstLessonId = enrollmentStatus?.firstLessonId ?? enrollmentDataFromHook?.firstLessonId ?? null;
  const isLoadingEnrollment = enrollmentStatus ? false : isLoadingEnrollmentFromHook;

  // Memoize wishlist toggle handler
  const handleWishlistToggle = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    toggleWishlist.mutate({
      id: courseId,
      courseId: courseId,
      title: course?.title,
      price: course?.price,
      thumbnailUrl: course?.thumbnailUrl || course?.image,
      image: course?.thumbnailUrl || course?.image,
      categoryName: course?.categoryName,
      isFree: course?.isFree,
      isCourse: true,
    });
  }, [isAuthenticated, toggleWishlist, courseId, course]);
  
  // Check if course is in wishlist (instant lookup from Zustand store)
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(courseId));
  
  // Optional: Also check from API for authenticated users
  const { data: checkData } = useCheckWishlist(courseId, {
    enabled: isAuthenticated && !!courseId,
  });
  
  const inWishlist = checkData?.inWishlist ?? isInWishlist;
  
  // Support both old mock data format and new API format
  const title = course?.title;
  
  // Handle lesson count - new format: formattedLessonCount, old format: lesson
  const lessonCount = course?.formattedLessonCount || course?.lesson || "0 Lessons";
  
  // Handle duration - new format: formattedDuration, old format: duration
  const duration = course?.formattedDuration || course?.duration || "0 min";
  
  // Handle image - new format: thumbnailUrl, old format: image
  // Fallback to placeholder if null/undefined
  const imageUrl = course?.thumbnailUrl || course?.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect fill='%23e5e7eb' width='400' height='225'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='24' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ECourse Image%3C/text%3E%3C/svg%3E";
  
  // Handle category - new format: categoryName, old format: categories
  const categoryName = course?.categoryName || course?.categories || "";
  const categoryBadgeClass = course?.categoryBadgeClass || getCategoryBadgeClass(categoryName) || "bg-secondaryColor";
  
  // Handle free course - new format: isFree (boolean), old format: isFree (boolean)
  const isFree = course?.isFree !== undefined ? course.isFree : (course?.courseTypeName?.toLowerCase() === "free" || course?.isFree);
  
  // Handle price - new format: price (can be null), old format: price (number)
  // Convert to number and handle null/undefined/string cases
  // Only set price if course is not free (paid course)
  const price = !isFree && course?.price != null ? (typeof course.price === 'number' ? course.price : parseFloat(course.price) || 0) : null;
  const originalPrice = !isFree && course?.originalPrice != null ? (typeof course.originalPrice === 'number' ? course.originalPrice : parseFloat(course.originalPrice) || 0) : null;
  
  // Handle instructors - new format: instructors array, old format: insName, insImg
  const instructors = course?.instructors || [];
  const primaryInstructor = instructors.length > 0 ? instructors[0] : null;
  const insName = primaryInstructor?.name || course?.insName || "Instructor";
  const insImg = primaryInstructor?.avatarUrl || primaryInstructor?.profileUrl || course?.insImg || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='50' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3E%3C/text%3E%3C/svg%3E";
  const instructorId = primaryInstructor?.id || courseId || "1";
  
  // Handle instructor count
  const instructorCount = course?.instructorCount || instructors.length || 1;

  // Calculate instructor ID for navigation (fallback to course ID modulo)
  let insId = 0;
  if (typeof instructorId === "string") {
    // Try to extract numeric part or use hash
    const numericPart = instructorId.match(/\d+/)?.[0] || "0";
    insId = parseInt(numericPart) % 6 || 6;
  } else {
    insId = (instructorId % 6) || 6;
  }

  // Navigation URL - use course-details-3 with courseId parameter
  const courseUrl = `/course-details-3?courseId=${courseId}`;
  const instructorUrl = `/instructors/${insId}`;

  // Handle enrollment button click
  const handleEnrollClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setShowEnrollmentModal(true);
  }, [isAuthenticated]);

  // Handle start button click (navigate to first lesson)
  const handleStartClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (firstLessonId && courseId) {
      router.push(`/lessons/1?courseId=${courseId}&lessonId=${firstLessonId}`);
    } else if (courseId) {
      // Fallback to course details if no lesson ID
      router.push(courseUrl);
    }
  }, [firstLessonId, courseId, router, courseUrl]);

  return (
    <div className="w-full group grid-item rounded">
      <div className="tab-content-wrapper">
        <div
          className={`p-15px lg:pr-30px bg-whiteColor shadow-brand dark:bg-darkdeep3-dark dark:shadow-brand-dark flex flex-wrap ${
            card ? "lg:flex-nowrap" : "md:flex-nowrap"
          } rounded`}
        >
          {/*  card image */}
          <div
            className={`relative overflow-hidden leading-1 ${
              card ? "lg:w-2/5" : "md:w-35%"
            } w-full`}
          >
            <Link
              href={courseUrl}
              className="block w-full overflow-hidden rounded z-0"
              style={{ pointerEvents: 'auto' }}
            >
              <div className="aspect-video w-full relative">
              <Image
                src={imageUrl}
                alt={title || "Course"}
                  fill
                  className="object-cover transition-all duration-300 group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
              />
              </div>
            </Link>
            {/* Category Badge */}
                {categoryName && (
              <div className="absolute left-2 top-2 z-20">
                  <p
                    className={`text-xs text-whiteColor px-4 py-[3px] rounded font-semibold capitalize ${categoryBadgeClass}`}
                  >
                    {categoryName}
                  </p>
              </div>
            )}
            {/* Wishlist Button */}
              <button
                onClick={handleWishlistToggle}
                disabled={toggleWishlist.isPending}
              className={`absolute right-2 top-2 z-30 text-white bg-black bg-opacity-15 rounded hover:bg-primaryColor transition-all duration-300 flex items-center justify-center ${
                  inWishlist ? 'bg-primaryColor bg-opacity-80' : ''
                } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''} ${toggleWishlist.isPending ? 'opacity-70' : ''}`}
                aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              style={{ zIndex: 30, pointerEvents: 'auto' }}
              >
                <i className={`icofont-heart${inWishlist ? '' : '-alt'} text-base py-1 px-2 leading-none inline-block`}></i>
              </button>
              
              {/* Login Modal */}
              <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onLoginSuccess={() => {
                  // After successful login, automatically add to wishlist
                  toggleWishlist.mutate({
                    id: courseId,
                    courseId: courseId,
                    title,
                    price,
                    thumbnailUrl: imageUrl,
                    image: imageUrl,
                    categoryName,
                    isFree,
                    isCourse: true,
                  });
                }}
                message="Please login to add this course to your wishlist."
              />
          </div>
          {/*  card content */}
          <div className={`w-full ${card ? "lg:w-3/5" : "md:w-65% "}`}>
            <div
              className={`${`pl-0 md:pl-5  lg:pl-30px  ${
                isNotSidebar ? "2xl:pl-90px" : ""
              }`} 
              `}
            >
              <div className="grid grid-cols-2 mb-15px">
                <div className="flex items-center">
                  <div>
                    <i className="icofont-book-alt pr-5px text-primaryColor text-lg"></i>
                  </div>
                  <div>
                    <span className="text-sm text-black dark:text-blackColor-dark">
                      {lessonCount}
                    </span>
                  </div>
                </div>
                <div className="flex items-center">
                  <div>
                    <i className="icofont-clock-time pr-5px text-primaryColor text-lg"></i>
                  </div>
                  <div>
                    <span className="text-sm text-black dark:text-blackColor-dark">
                      {duration}
                    </span>
                  </div>
                </div>
              </div>
              <h4>
                <Link
                  href={courseUrl}
                  className={`${
                    card
                      ? "text-size-26 leading-30px "
                      : "text-xl 2xl:text-size-34 2xl:!leading-9"
                  }  font-semibold text-blackColor mb-10px  dark:text-blackColor-dark hover:text-primaryColor dark:hover:text-primaryColor`}
                >
                  {title}
                </Link>
              </h4>
              {/*  price - only show if not free */}
              {!isFree && price != null && typeof price === 'number' && !isNaN(price) ? (
                <div className="text-lg font-medium text-black-brerry-light mb-4">
                  ${price.toFixed(2)}
                  {originalPrice != null && typeof originalPrice === 'number' && !isNaN(originalPrice) && originalPrice > price && (
                    <del className="text-sm text-lightGrey4 font-semibold">
                      ${originalPrice.toFixed(2)}
                    </del>
                  )}
                  <span className="ml-6 text-base font-semibold text-secondaryColor3">
                    <del>Free</del>
                  </span>
                </div>
              ) : isFree ? (
                <div className="text-lg font-medium text-greencolor mb-4">
                  <span className="text-base font-semibold">Free</span>
                </div>
              ) : null}
              
              {/*  bottom */}
              <div className="flex flex-wrap justify-between sm:flex-nowrap items-center gap-y-2 pt-15px border-t border-borderColor">
                {/*  author and rating*/}
                <div className="flex items-center flex-wrap">
                  <div>
                    <Link
                      href={instructorUrl}
                      className="text-sm font-medium font-hind flex items-center hover:text-primaryColor dark:text-blackColor-dark dark:hover:text-primaryColor"
                    >
                      <Image
                        className="w-[30px] h-[30px] rounded-full mr-15px object-cover"
                        src={insImg}
                        alt={insName}
                        width={30}
                        height={30}
                        placeholder="blur"
                        blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='50' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3E%3C/text%3E%3C/svg%3E"
                      />
                      <span className="flex">{insName}</span>
                      {instructorCount > 1 && (
                        <span className="text-xs text-contentColor dark:text-contentColor-dark ml-1">
                          +{instructorCount - 1}
                        </span>
                      )}
                    </Link>
                  </div>
                  <div className="text-start md:text-end ml-35px">
                    <i className="icofont-star text-size-15 text-yellow"></i>
                    <i className="icofont-star text-size-15 text-yellow"></i>
                    <i className="icofont-star text-size-15 text-yellow"></i>
                    <i className="icofont-star text-size-15 text-yellow"></i>

                    <span className="text-xs text-lightGrey6">(44)</span>
                  </div>
                </div>

                <div>
                  <Link
                    className="text-sm lg:text-base text-blackColor hover:text-primaryColor dark:text-blackColor-dark dark:hover:text-primaryColor"
                    href={courseUrl}
                  >
                    Know Details
                    <i className="icofont-arrow-right"></i>
                  </Link>
                </div>
              </div>

              {/* Enroll Now / Start Button - Only for student and alumni roles */}
              {canShowEnrollButton && (
                <div className="mt-4">
                  {isLoadingEnrollment ? (
                    <button
                      disabled
                      className="w-full px-25px py-10px bg-lightGrey5 dark:bg-darkdeep1 text-contentColor dark:text-contentColor-dark rounded font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </button>
                  ) : isEnrolled ? (
                    <button
                      onClick={handleStartClick}
                      className="w-full px-25px py-10px bg-greencolor text-whiteColor rounded font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:bg-greencolor/90 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] group"
                      aria-label="Start Course"
                    >
                      <i className="icofont-play-circle text-base"></i>
                      <span>Start</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleEnrollClick}
                      className="w-full px-25px py-10px bg-primaryColor text-whiteColor rounded font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:bg-primaryColor/90 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] group"
                      aria-label="Enroll Now"
                    >
                      <span>Enroll Now</span>
                      <i className="icofont-arrow-right text-base transition-transform duration-300 group-hover:translate-x-1"></i>
                    </button>
                  )}
                </div>
              )}
              
              {/* Enrollment Modals */}
              {canShowEnrollButton && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CourseCard2.displayName = 'CourseCard2';

export default CourseCard2;
