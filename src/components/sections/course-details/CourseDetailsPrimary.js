'use client';

import CourseDetailsSidebar from "@/components/shared/courses/CourseDetailsSidebar";
import Image from "next/image";
import blogImag8 from "@/assets/images/blog/blog_8.png";
import BlogTagsAndSocila from "@/components/shared/blog-details/BlogTagsAndSocila";
import ClientComment from "@/components/shared/blog-details/ClientComment";
import CommentFome from "@/components/shared/forms/CommentFome";
import CourseDetailsTab from "@/components/shared/course-details/CourseDetailsTab";
import InstrutorOtherCourses from "@/components/shared/course-details/InstrutorOtherCourses";
import { useCourseDetails } from "@/hooks/api/useCourseDetails";
import { useCourseProgress } from "@/hooks/api/useCourseProgress";
import { useAuthStore } from "@/store/index.js";
import { formatDateShort } from "@/lib/utils/dateFormatter";
import CourseDetailsSkeleton from "@/components/shared/loading/CourseDetailsSkeleton";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import { calculateTotalDuration, formatCourseDuration } from "@/lib/utils/courseUtils";
import { useState, useEffect } from "react";

const CourseDetailsPrimary = ({ courseId, type }) => {
  const { data: course, isLoading, error } = useCourseDetails(courseId);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;
  const isStudent = userRole === 'student' || userRole === 'alumni';
  const [imageError, setImageError] = useState(false);
  
  // Fetch progress for students
  const { data: progress, isLoading: isLoadingProgress } = useCourseProgress(courseId, {
    enabled: isStudent && !!courseId,
  });

  // Reset image error when course changes
  useEffect(() => {
    setImageError(false);
  }, [course?.coverImageUrl]);

  // Calculate course ID for tabs (fallback logic)
  let cid = 0;
  if (course?.id) {
    // Use a simple hash or modulo of course ID for tab selection
    const idStr = course.id.replace(/-/g, '');
    const idNum = parseInt(idStr.substring(0, 8), 16) || 0;
    cid = idNum % 6 || 6;
  }

  // Format lessons count
  const formatLessonsCount = (count) => {
    if (!count || count === 0) return '--';
    return count === 1 ? '1 Lesson' : `${count} Lessons`;
  };

  // Format ratings display
  const formatRatings = (count) => {
    if (!count || count === 0) return '--';
    return `(${count})`;
  };

  // Calculate and format course duration
  const totalDurationMinutes = calculateTotalDuration(course?.modules || []);
  const formattedDuration = formatCourseDuration(totalDurationMinutes);

  // Get cover image URL with fallback
  const getCoverImageUrl = () => {
    if (imageError || !course?.coverImageUrl) {
      return blogImag8;
    }
    return course.coverImageUrl;
  };

  // Check if image is a static import (for placeholder blur)
  const isStaticImage = (src) => {
    return src === blogImag8 || typeof src === 'object' || !src.startsWith('http');
  };

  // Render stars based on average rating
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <>
        {Array.from({ length: fullStars }).map((_, i) => (
          <i key={`full-${i}`} className="icofont-star text-size-15 text-yellow"></i>
        ))}
        {hasHalfStar && (
          <i className="icofont-star-half text-size-15 text-yellow"></i>
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <i key={`empty-${i}`} className="icofont-star text-size-15 text-gray-300"></i>
        ))}
      </>
    );
  };

  // Show skeleton while loading
  if (isLoading) {
    return (
      <section>
        <div className="container py-10 md:py-50px lg:py-60px 2xl:py-100px">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-30px">
            <div className="lg:col-start-1 lg:col-span-8">
              <CourseDetailsSkeleton />
            </div>
            <div className="lg:col-start-9 lg:col-span-4">
              <SkeletonLoader type="card" className="h-96" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Show error state
  if (error || !course) {
    return (
      <section>
        <div className="container py-10 md:py-50px lg:py-60px 2xl:py-100px">
          <div className="text-center py-20">
            <p className="text-lg text-contentColor dark:text-contentColor-dark">
              {error?.message || 'Course not found'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={type === 3 ? 'relative' : ''}>
      <div className={`container ${type === 3 ? 'py-0' : 'py-10 md:py-50px lg:py-60px 2xl:py-100px'}`}>
        {/* For type 3, use relative positioning to allow sidebar overlap */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-30px">
          <div className="lg:col-start-1 lg:col-span-8 space-y-[35px]">
            {/* Main Course Section */}
            <div data-aos="fade-up">
              {/* Category, Program Type buttons and Last Update - Only for type 2 (not 3, as it's in hero) */}
              {type === 2 && (
                <div
                  className="flex items-center justify-between flex-wrap gap-6 mb-30px"
                  data-aos="fade-up"
                >
                  <div className="flex items-center gap-6">
                    {course.pinned && (
                      <button className="text-sm text-whiteColor bg-primaryColor border border-primaryColor px-26px py-0.5 leading-23px font-semibold hover:text-primaryColor hover:bg-whiteColor rounded inline-block dark:hover:bg-whiteColor-dark dark:hover:text-whiteColor">
                        Featured
                      </button>
                    )}
                    {course.categoryName && (
                      <button className="text-sm text-whiteColor bg-indigo border border-indigo px-22px py-0.5 leading-23px font-semibold hover:text-indigo hover:bg-whiteColor rounded inline-block dark:hover:bg-whiteColor-dark dark:hover:text-indigo">
                        {course.categoryName}
                      </button>
                    )}
                    {course.programTypeName && (
                      <button className="text-sm text-whiteColor bg-indigo border border-indigo px-22px py-0.5 leading-23px font-semibold hover:text-indigo hover:bg-whiteColor rounded inline-block dark:hover:bg-whiteColor-dark dark:hover:text-indigo">
                        {course.programTypeName}
                      </button>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-contentColor dark:text-contentColor-dark font-medium">
                      Last Update:{" "}
                      <span className="text-blackColor dark:text-blackColor-dark">
                        {formatDateShort(course.updatedAt) || '--'}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Title - Only for type 2 (not 3, as it's in hero) */}
              {type === 2 && (
                <h4
                  className="text-size-32 md:text-4xl font-bold text-blackColor dark:text-blackColor-dark mb-15px leading-43px md:leading-14.5"
                  data-aos="fade-up"
                >
                  {course.title || "--"}
                </h4>
              )}

              {/* course thumbnail / intro video - Only for type 2 (not 3, as it's in hero) */}
              {type === 2 ? (
                course.introVideoUrl ? (
                  <div className="overflow-hidden relative mb-5 aspect-video">
                    <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Image
                        src={getCoverImageUrl()}
                        alt={course.title || "Course"}
                        className="w-full h-full object-cover"
                        placeholder={isStaticImage(getCoverImageUrl()) ? "blur" : "empty"}
                        fill
                        onError={() => setImageError(true)}
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-40 transition-all cursor-pointer">
                      <div className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                        <i className="icofont-play text-2xl text-primaryColor ml-1"></i>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden relative mb-5 aspect-video bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <Image
                      src={course.coverImageUrl || blogImag8}
                      alt={course.title || "Course"}
                      className="w-full h-full object-cover"
                      placeholder="blur"
                      fill
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        e.target.src = blogImag8.src || blogImag8;
                      }}
                    />
                  </div>
                )
              ) : type === 1 ? (
                <div className="overflow-hidden relative mb-5">
                  <Image
                    src={getCoverImageUrl()}
                    alt={course.title || "Course"}
                    className="w-full"
                    placeholder={isStaticImage(getCoverImageUrl()) ? "blur" : "empty"}
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : null}

              {/* course content  */}
              <div>
                {/* Category, Program Type buttons and Last Update - Show for type 1 (not 2 or 3) */}
                {type !== 2 && type !== 3 && (
                  <div
                    className="flex items-center justify-between flex-wrap gap-6 mb-30px"
                    data-aos="fade-up"
                  >
                    <div className="flex items-center gap-6">
                      {course.pinned && (
                        <button className="text-sm text-whiteColor bg-primaryColor border border-primaryColor px-26px py-0.5 leading-23px font-semibold hover:text-primaryColor hover:bg-whiteColor rounded inline-block dark:hover:bg-whiteColor-dark dark:hover:text-whiteColor">
                          Featured
                        </button>
                      )}
                      {course.categoryName && (
                        <button className="text-sm text-whiteColor bg-indigo border border-indigo px-22px py-0.5 leading-23px font-semibold hover:text-indigo hover:bg-whiteColor rounded inline-block dark:hover:bg-whiteColor-dark dark:hover:text-indigo">
                          {course.categoryName}
                        </button>
                      )}
                      {course.programTypeName && (
                        <button className="text-sm text-whiteColor bg-indigo border border-indigo px-22px py-0.5 leading-23px font-semibold hover:text-indigo hover:bg-whiteColor rounded inline-block dark:hover:bg-whiteColor-dark dark:hover:text-indigo">
                          {course.programTypeName}
                        </button>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-contentColor dark:text-contentColor-dark font-medium">
                        Last Update:{" "}
                        <span className="text-blackColor dark:text-blackColor-dark">
                          {formatDateShort(course.updatedAt) || '--'}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* title - Show for type 1 (not 2 or 3) */}
                {type !== 2 && type !== 3 && (
                  <h4
                    className="text-size-32 md:text-4xl font-bold text-blackColor dark:text-blackColor-dark mb-15px leading-43px md:leading-14.5"
                    data-aos="fade-up"
                  >
                    {course.title || "--"}
                  </h4>
                )}

                {/* price, lessons count and rating - Show for all types */}
                <div
                  className="flex gap-5 flex-wrap items-center mb-30px"
                  data-aos="fade-up"
                >
                  {course.discountedPrice > 0 && (
                    <div className="text-size-21 font-medium text-primaryColor font-inter leading-25px">
                      ${course.discountedPrice.toFixed(2)}{" "}
                      {course.regularPrice > course.discountedPrice && (
                        <del className="text-sm text-lightGrey4 font-semibold">
                          / ${course.regularPrice.toFixed(2)}
                        </del>
                      )}
                    </div>
                  )}
                  <div className="flex items-center">
                    <div>
                      <i className="icofont-book-alt pr-5px text-primaryColor text-lg"></i>
                    </div>
                    <div>
                      <span className=" text-black dark:text-blackColor-dark">
                        {formatLessonsCount(course.totalLessons)}
                      </span>
                    </div>
                  </div>
                  <div className="text-start md:text-end">
                    {renderStars(course.averageRating)}
                    <span className=" text-blackColor dark:text-blackColor-dark">
                      {" "}{formatRatings(course.totalRatings)}
                    </span>
                  </div>
                </div>

                {/* Course Progress - Show for enrolled students */}
                {isStudent && progress && !isLoadingProgress && (
                  <div className="mb-30px" data-aos="fade-up">
                    <h4 className="text-size-22 text-blackColor dark:text-blackColor-dark font-bold pl-2 before:w-0.5 relative before:h-[21px] before:bg-primaryColor before:absolute before:bottom-[5px] before:left-0 leading-30px mb-15px">
                      Your Progress
                    </h4>
                    <div className="bg-darkdeep3 dark:bg-darkdeep3-dark p-5 rounded">
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-contentColor dark:text-contentColor-dark">
                            Overall Progress
                          </span>
                          <span className="text-sm font-bold text-blackColor dark:text-blackColor-dark">
                            {Math.round(progress.progressPercentage)}%
                          </span>
                        </div>
                        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primaryColor transition-all duration-300"
                            style={{ width: `${progress.progressPercentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-contentColor dark:text-contentColor-dark">Enrollment: </span>
                          <span className="font-medium text-blackColor dark:text-blackColor-dark">
                            {Math.round(progress.enrollmentProgress)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-contentColor dark:text-contentColor-dark">Lessons: </span>
                          <span className="font-medium text-blackColor dark:text-blackColor-dark">
                            {Math.round(progress.lessonProgress)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-contentColor dark:text-contentColor-dark">Assignments: </span>
                          <span className="font-medium text-blackColor dark:text-blackColor-dark">
                            {Math.round(progress.assignmentProgress)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-contentColor dark:text-contentColor-dark">Quizzes: </span>
                          <span className="font-medium text-blackColor dark:text-blackColor-dark">
                            {Math.round(progress.quizProgress)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Course Details section - Only show for type 1 (not 2 or 3) */}
                {type !== 2 && type !== 3 && (
                  <>
                    <p
                      className="text-sm md:text-lg text-contentColor dark:contentColor-dark mb-25px !leading-30px"
                      data-aos="fade-up"
                    >
                      {course.description || '--'}
                    </p>
                    {/* details  */}
                    <div>
                      <h4
                        className="text-size-22 text-blackColor dark:text-blackColor-dark font-bold pl-2 before:w-0.5 relative before:h-[21px] before:bg-primaryColor before:absolute before:bottom-[5px] before:left-0 leading-30px mb-25px"
                        data-aos="fade-up"
                      >
                        Course Details
                      </h4>

                      <div
                        className="bg-darkdeep3 dark:bg-darkdeep3-dark mb-30px grid grid-cols-1 md:grid-cols-2"
                        data-aos="fade-up"
                      >
                        <ul className="p-10px md:py-55px md:pl-50px md:pr-70px lg:py-35px lg:px-30px 2xl:py-55px 2xl:pl-50px 2xl:pr-70px border-r-2 border-borderColor dark:border-borderColor-dark space-y-[10px]">
                          <li>
                            <p className="text-contentColor2 dark:text-contentColor2-dark flex justify-between items-center">
                              Instructor :
                              <span className="text-base lg:text-sm 2xl:text-base text-blackColor dark:text-deepgreen-dark font-medium text-opacity-100">
                                {insName || "Mirnsdo.H"}
                              </span>
                            </p>
                          </li>
                          <li>
                            <p className="text-contentColor2 dark:text-contentColor2-dark flex justify-between items-center">
                              Lectures :
                              <span className="text-base lg:text-sm 2xl:text-base text-blackColor dark:text-deepgreen-dark font-medium text-opacity-100">
                                120 sub
                              </span>
                            </p>
                          </li>
                          <li>
                            <p className="text-contentColor2 dark:text-contentColor2-dark flex justify-between items-center">
                              Duration :
                              <span className="text-base lg:text-sm 2xl:text-base text-blackColor dark:text-deepgreen-dark font-medium text-opacity-100">
                                {formattedDuration || '--'}
                              </span>
                            </p>
                          </li>
                          <li>
                            <p className="text-contentColor2 dark:text-contentColor2-dark flex justify-between items-center">
                              Enrolled :
                              <span className="text-base lg:text-sm 2xl:text-base text-blackColor dark:text-deepgreen-dark font-medium text-opacity-100">
                                2 students
                              </span>
                            </p>
                          </li>
                          <li>
                            <p className="text-contentColor2 dark:text-contentColor2-dark flex justify-between items-center">
                              Total :
                              <span className="text-base lg:text-sm 2xl:text-base text-blackColor dark:text-deepgreen-dark font-medium text-opacity-100">
                                222 students
                              </span>
                            </p>
                          </li>
                        </ul>
                        <ul className="p-10px md:py-55px md:pl-50px md:pr-70px lg:py-35px lg:px-30px 2xl:py-55px 2xl:pl-50px 2xl:pr-70px border-r-2 border-borderColor dark:border-borderColor-dark space-y-[10px]">
                          <li>
                            <p className="text-contentColor2 dark:text-contentColor2-dark flex justify-between items-center">
                              Course level :
                              <span className="text-base lg:text-sm 2xl:text-base text-blackColor dark:text-deepgreen-dark font-medium text-opacity-100">
                                Intermediate
                              </span>
                            </p>
                          </li>
                          <li>
                            <p className="text-contentColor2 dark:text-contentColor2-dark flex justify-between items-center">
                              Language :
                              <span className="text-base lg:text-sm 2xl:text-base text-blackColor dark:text-deepgreen-dark font-medium text-opacity-100">
                                English spanish
                              </span>
                            </p>
                          </li>
                          <li>
                            <p className="text-contentColor2 dark:text-contentColor2-dark flex justify-between items-center">
                              Price Discount :
                              <span className="text-base lg:text-sm 2xl:text-base text-blackColor dark:text-deepgreen-dark font-medium text-opacity-100">
                                -20%
                              </span>
                            </p>
                          </li>
                          <li>
                            <p className="text-contentColor2 dark:text-contentColor2-dark flex justify-between items-center">
                              Regular Price :
                              <span className="text-base lg:text-sm 2xl:text-base text-blackColor dark:text-deepgreen-dark font-medium text-opacity-100">
                                $228/Mo
                              </span>
                            </p>
                          </li>
                          <li>
                            <p className="text-contentColor2 dark:text-contentColor2-dark flex justify-between items-center">
                              Course Status :
                              <span className="text-base lg:text-sm 2xl:text-base text-blackColor dark:text-deepgreen-dark font-medium text-opacity-100">
                                Available
                              </span>
                            </p>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
                {/* course tab  */}
                <CourseDetailsTab id={cid} type={type} courseId={courseId} modules={course.modules} course={course} />
                <div className="md:col-start-5 md:col-span-8 mb-5">
                  <h4
                    className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-15px !leading-38px"
                    data-aos="fade-up"
                  >
                    Why search Is Important ?
                  </h4>
                  <ul className="space-y-[15px] max-w-127">
                    <li className="flex items-center group" data-aos="fade-up">
                      <i className="icofont-check px-2 py-2 text-primaryColor bg-whitegrey3 bg-opacity-40 group-hover:bg-primaryColor group-hover:text-white group-hover:opacity-100 mr-15px dark:bg-whitegrey1-dark"></i>
                      <p className="text-sm lg:text-xs 2xl:text-sm font-medium leading-25px lg:leading-21px 2xl:leading-25px text-contentColor dark:text-contentColor-dark">
                        Lorem Ipsum is simply dummying text of the printing
                        andtypesetting industry most of the standard.
                      </p>
                    </li>
                    <li className="flex items-center group" data-aos="fade-up">
                      <i className="icofont-check px-2 py-2 text-primaryColor bg-whitegrey3 bg-opacity-40 group-hover:bg-primaryColor group-hover:text-white group-hover:opacity-100 mr-15px dark:bg-whitegrey1-dark"></i>
                      <p className="text-sm lg:text-xs 2xl:text-sm font-medium leading-25px lg:leading-21px 2xl:leading-25px text-contentColor dark:text-contentColor-dark">
                        Lorem Ipsum is simply dummying text of the printing
                        andtypesetting industry most of the standard.
                      </p>
                    </li>
                    <li className="flex items-center group" data-aos="fade-up">
                      <i className="icofont-check px-2 py-2 text-primaryColor bg-whitegrey3 bg-opacity-40 group-hover:bg-primaryColor group-hover:text-white group-hover:opacity-100 mr-15px dark:bg-whitegrey1-dark"></i>
                      <p className="text-sm lg:text-xs 2xl:text-sm font-medium leading-25px lg:leading-21px 2xl:leading-25px text-contentColor dark:text-contentColor-dark">
                        Lorem Ipsum is simply dummying text of the printing
                        andtypesetting industry most of the standard.
                      </p>
                    </li>
                    <li className="flex items-center group" data-aos="fade-up">
                      <i className="icofont-check px-2 py-2 text-primaryColor bg-whitegrey3 bg-opacity-40 group-hover:bg-primaryColor group-hover:text-white group-hover:opacity-100 mr-15px dark:bg-whitegrey1-dark"></i>
                      <p className="text-sm lg:text-xs 2xl:text-sm font-medium leading-25px lg:leading-21px 2xl:leading-25px text-contentColor dark:text-contentColor-dark">
                        Lorem Ipsum is simply dummying text of the printing
                        andtypesetting industry most of the standard.
                      </p>
                    </li>
                  </ul>
                </div>
                {/* tag and share   */}

                <BlogTagsAndSocila />
                {/* other courses  */}
                <InstrutorOtherCourses course={course} courseId={courseId} />
                {/* previous comment area  */}
                <ClientComment courseId={courseId} />
                {/* write comment area  */}
                <CommentFome courseId={courseId} />
              </div>
            </div>
          </div>
          {/* course sidebar - For type 3, position to overlap bottom right of video container */}
          <div
            className={`lg:col-start-9 lg:col-span-4 ${
              type === 3 
                ? "relative lg:-mt-[400px] lg:z-10" 
                : type === 2 
                ? "relative lg:top-[-340px]" 
                : ""
            }`}
          >
            <CourseDetailsSidebar type={type} course={course} courseId={courseId} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CourseDetailsPrimary;
