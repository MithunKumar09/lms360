"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useState, memo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCategoryBadgeClass } from "@/lib/utils/courseUtils";
import { useToggleWishlist, useCheckWishlist } from "@/hooks/api/useWishlist";
import { useWishlistStore } from "@/store/index.js";
import { useAuthStore } from "@/store/index.js";
import { useCheckEnrollment } from "@/hooks/api/useEnrollment";
import LoginModal from "@/components/shared/modals/LoginModal";
import FreeCourseEnrollmentModal from "@/components/shared/modals/FreeCourseEnrollmentModal";
import PaidCourseEnrollmentModal from "@/components/shared/modals/PaidCourseEnrollmentModal";
import useSweetAlert from "@/hooks/useSweetAlert";
import blogImag8 from "@/assets/images/blog/blog_8.png";

const CourseCard = memo(({ course, type, enrollmentStatus }) => {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;
  const toggleWishlist = useToggleWishlist();
  const createAlert = useSweetAlert();
  const courseId = course?.id || course?.courseId;
  // Navigation URL - use course-details-3 with courseId parameter (defined early for use in callbacks)
  const courseUrl = `/course-details-3?courseId=${courseId}`;
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset image error when course changes
  useEffect(() => {
    setImageError(false);
  }, [course?.coverImageUrl, course?.thumbnailUrl]);

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
      // Redirect to login page instantly for security
      const redirectUrl = encodeURIComponent(courseUrl);
      router.push(`/login?redirect=${redirectUrl}`);
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
  }, [isAuthenticated, toggleWishlist, courseId, course, courseUrl, router]);
  
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
  
  // Check if URL is a video file (not an image)
  const isVideoUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext));
  };

  // Handle cover image - prioritize coverImageUrl (like course-details page)
  // Fallback to blogImag8 if coverImageUrl is null or image fails to load
  const getCoverImageUrl = () => {
    if (imageError) {
      return blogImag8;
    }
    // Prioritize coverImageUrl, but only if it's not a video file
    if (course?.coverImageUrl && !isVideoUrl(course.coverImageUrl)) {
      return course.coverImageUrl;
    }
    // Only use thumbnailUrl if it's not a video file
    if (course?.thumbnailUrl && !isVideoUrl(course.thumbnailUrl)) {
      return course.thumbnailUrl;
    }
    // Fallback to blogImag8 if no valid image URL found
    return blogImag8;
  };

  // Check if image is a static import (for placeholder blur)
  const isStaticImage = (src) => {
    return src === blogImag8 || typeof src === 'object' || !src.startsWith('http');
  };

  // Check if we should use blur placeholder (only for static images like blogImag8)
  const shouldUseBlur = (src) => {
    // Only use blur for static imports (blogImag8)
    if (src === blogImag8 || (typeof src === 'object' && src !== null)) {
      return true;
    }
    // Never use blur for video URLs or remote images without blurDataURL
    if (typeof src === 'string' && isVideoUrl(src)) {
      return false;
    }
    // For remote images, don't use blur (Next.js requires blurDataURL for remote images)
    return false;
  };

  // Handle image - new format: coverImageUrl (preferred), thumbnailUrl, old format: image
  // Fallback to blogImag8 if coverImageUrl is null/undefined
  const imageUrl = getCoverImageUrl();
  
  // Handle category - new format: categoryName, old format: categories
  const categoryName = course?.categoryName || course?.categories || "";
  const categoryBadgeClass = course?.categoryBadgeClass || getCategoryBadgeClass(categoryName) || "bg-secondaryColor";
  
  // Handle free course - new format: isFree (boolean), old format: isFree (boolean)
  const isFree = course?.isFree !== undefined ? course.isFree : (course?.courseTypeName?.toLowerCase() === "free" || course?.isFree);
  
  // Handle price - new format: price (can be null), old format: price (number)
  // Convert to number and handle null/undefined/string cases
  const price = course?.price != null ? (typeof course.price === 'number' ? course.price : parseFloat(course.price) || 0) : null;
  const originalPrice = course?.originalPrice != null ? (typeof course.originalPrice === 'number' ? course.originalPrice : parseFloat(course.originalPrice) || 0) : null;
  
  // Handle instructors - new format: instructors array, old format: insName, insImg
  const instructors = course?.instructors || [];
  const primaryInstructor = instructors.length > 0 ? instructors[0] : null;
  const insName = primaryInstructor?.name || course?.instructorName || course?.insName || "Instructor";
  const insImg = primaryInstructor?.avatarUrl || primaryInstructor?.avatar_url || primaryInstructor?.profileUrl || primaryInstructor?.profile_url || course?.instructorAvatar || course?.insImg || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='50' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3E%3C/text%3E%3C/svg%3E";
  const instructorId = primaryInstructor?.id || courseId || "1";
  
  // Handle instructor count
  const instructorCount = course?.instructorCount || instructors.length || 1;
  
  // Handle ratings - new format: averageRating and totalReviews, old format: rating
  const averageRating = course?.averageRating != null ? parseFloat(course.averageRating) : (course?.rating || 0);
  const totalReviews = course?.totalReviews != null ? parseInt(course.totalReviews, 10) : (course?.reviewCount || 0);
  
  // Calculate star display (round to nearest 0.5)
  const roundedRating = Math.round(averageRating * 2) / 2;
  const fullStars = Math.floor(roundedRating);
  const hasHalfStar = roundedRating % 1 >= 0.5;
  
  // Other properties
  const filterOption = course?.filterOption;
  const isActive = course?.isActive || (!course?.isCompleted && (course?.progress || 0) > 0);
  const isCompleted = course?.isCompleted || (course?.progress >= 100);
  const completedParchent = course?.completedParchent || Math.round(course?.progress || 0);

  // Calculate instructor ID for navigation (fallback to course ID modulo)
  let insId = 0;
  if (typeof instructorId === "string") {
    // Try to extract numeric part or use hash
    const numericPart = instructorId.match(/\d+/)?.[0] || "0";
    insId = parseInt(numericPart) % 6 || 6;
  } else {
    insId = (instructorId % 6) || 6;
  }

  // Instructor URL
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

  // Handle course card click - redirect to login if not authenticated
  const handleCourseClick = useCallback((e) => {
    if (!isAuthenticated) {
      e.preventDefault();
      e.stopPropagation();
      // Redirect to login with redirect parameter to come back to course after login
      const redirectUrl = encodeURIComponent(courseUrl);
      router.push(`/login?redirect=${redirectUrl}`);
    }
    // If authenticated, let the Link handle navigation normally
  }, [isAuthenticated, courseUrl, router]);

  return (
    <div
      className={`group ${type === "primary" ? "w-full" : type === "primaryMd" ? "" : `w-full sm:w-1/2 lg:w-1/3 grid-item ${
              type === "lg" ? "xl:w-1/4" : ""
            }`} ${filterOption ? filterOption : ""}`}
    >
      <div className={`${type === "primary" ? "h-full w-full" : type === "primaryMd" ? "" : "sm:px-15px  mb-30px"}`}>
        <div className={`p-15px bg-whiteColor shadow-brand dark:bg-darkdeep3-dark dark:shadow-brand-dark ${type === "primary" ? "h-full w-full flex flex-col" : ""}`}>
          {/* card image */}
          <div className="relative mb-2 aspect-video w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
            <Link
              href={courseUrl}
              onClick={handleCourseClick}
              className="absolute inset-0 w-full h-full z-0"
              style={{ pointerEvents: 'auto' }}
            >
              <Image
                src={imageUrl}
                alt={title || "Course"}
                priority={true}
                fill
                className="object-cover transition-all duration-300 group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                placeholder={shouldUseBlur(imageUrl) ? "blur" : undefined}
                onError={(e) => {
                  // Fallback to blogImag8 if image fails to load
                  setImageError(true);
                  e.target.src = blogImag8.src || blogImag8;
                }}
              />
            </Link>
            {/* Category Badge */}
                {categoryName && (
              <div className="absolute left-2 top-2 z-20">
                  <p
                    className={`text-xs text-whiteColor px-4 py-[3px] rounded font-semibold ${categoryBadgeClass}`}
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
          {/* card content */}
          <div className={`${type === "primary" ? "flex-1 flex flex-col" : ""}`}>
            <div className="grid grid-cols-2 mb-3">
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
            <h5 className={`${type === "primaryMd" ? "text-lg " : "text-xl "}`}>
              <Link
                href={courseUrl}
                onClick={handleCourseClick}
                className={`font-semibold text-blackColor mb-10px dark:text-blackColor-dark hover:text-primaryColor dark:hover:text-primaryColor ${
                  type === "primaryMd" ? "leading-25px" : "leading-27px "
                } `}
              >
                {title}
              </Link>
            </h5>
            {/* price - only show if not free */}
            {!isFree && price != null && typeof price === 'number' && !isNaN(price) ? (
              <div className="text-lg font-semibold text-primaryColor">
                ${price.toFixed(2)}
                {originalPrice != null && typeof originalPrice === 'number' && !isNaN(originalPrice) && originalPrice > price && (
                  <del className="text-sm text-lightGrey4 font-semibold ml-1">
                    ${originalPrice.toFixed(2)}
                  </del>
                )}
                <span className="ml-6 text-base font-semibold text-secondaryColor3">
                  <del>Free</del>
                </span>
              </div>
            ) : isFree ? (
              <div className="text-lg font-semibold text-greencolor">
                <span className="text-base font-semibold">Free</span>
              </div>
            ) : null}
            
            {/* author and rating */}
            <div className={`grid grid-cols-1 ${type === "primary" ? "md:grid-cols-2" : "md:grid-cols-2"} pt-2 border-t border-borderColor ${type === "primary" ? "" : ""}`}>
              <div>
                <h6>
                  <Link
                    href={instructorUrl}
                    className="text-base font-bold flex items-center hover:text-primaryColor dark:text-blackColor-dark dark:hover:text-primaryColor"
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
                    <span className="whitespace-nowrap">{insName}</span>
                    {instructorCount > 1 && (
                      <span className="text-xs text-contentColor dark:text-contentColor-dark ml-1">
                        +{instructorCount - 1}
                      </span>
                    )}
                  </Link>
                </h6>
              </div>
              <div className="text-start md:text-end space-x-1">
                {[1, 2, 3, 4, 5].slice(0, type === "primaryMd" ? 4 : 5).map((star) => {
                  if (star <= fullStars) {
                    return <i key={star} className="icofont-star text-size-15 text-yellow"></i>;
                  } else if (star === fullStars + 1 && hasHalfStar) {
                    return <i key={star} className="icofont-star-half text-size-15 text-yellow"></i>;
                  } else {
                    return <i key={star} className="icofont-star text-size-15 text-gray-300"></i>;
                  }
                })}
                {totalReviews > 0 && (
                  <span className="text-xs text-lightGrey6">({totalReviews})</span>
                )}
              </div>
            </div>
            {isCompleted || isActive ? (
              <div>
                <div className="h-25px w-full bg-blue-x-light rounded-md relative mt-5 mb-15px">
                  <div
                    className={`text-center bg-primaryColor absolute top-0 left-0 rounded-md leading-25px`}
                    style={{
                      width: isActive ? completedParchent + "%" : "100%",
                      height: "100%",
                    }}
                  >
                    <span className="text-size-10 text-whiteColor block leading-25px">
                      {isActive ? completedParchent : 100}% Complete
                    </span>
                  </div>
                </div>
                {isCompleted ? (
                  <div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        createAlert({
                          icon: 'info',
                          title: 'Certificate Feature',
                          text: 'Certificate feature coming soon!',
                        });
                      }}
                      className="text-size-15 text-whiteColor bg-secondaryColor w-full px-25px py-10px border border-secondaryColor hover:text-secondaryColor hover:bg-whiteColor rounded group text-nowrap text-center"
                    >
                      Download Certificate
                    </button>
                  </div>
                ) : (
                  ""
                )}
              </div>
            ) : canShowEnrollButton ? (
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
            ) : (
              ""
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

CourseCard.displayName = 'CourseCard';

export default CourseCard;
