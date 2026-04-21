"use client";

import BalbImage from "@/components/shared/animaited-images/BalbImage";
import BookImage from "@/components/shared/animaited-images/BookImage";
import GlobImage from "@/components/shared/animaited-images/GlobImage";
import TriangleImage from "@/components/shared/animaited-images/TriangleImage";
import PopupVideo from "@/components/shared/popup/PopupVideo";
import Image from "next/image";
import blogImage7 from "@/assets/images/blog/blog_7.png";
import blogImag8 from "@/assets/images/blog/blog_8.png";
import { formatDateShort } from "@/lib/utils/dateFormatter";
import { useEffect, useState } from "react";
import videoModal from "@/libs/videoModal";
import CourseIntroVideoModal from "@/components/shared/modals/CourseIntroVideoModal";

const HeroPrimary2 = ({ type, course }) => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Initialize video modal for play button - reinitialize when course data loads (for non-type-3)
  useEffect(() => {
    if (type !== 3) {
      videoModal();
    }
  }, [type]);

  // Reset image error when course changes
  useEffect(() => {
    setImageError(false);
  }, [course?.coverImageUrl]);

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
  return (
    <section data-aos="fade-up">
      {/* banner section */}
      <div
        className={`bg-lightGrey10 dark:bg-lightGrey10-dark relative z-0 overflow-y-visible ${
          type === 3 ? "pt-50px pb-0" : "py-50px"
        }`}
      >
        {/* animated icons */}
        <div>
          <BookImage type={"secondary"} />
          <GlobImage type={"secondary"} />
          <BalbImage type={"secondary"} />
          <TriangleImage type={"secondary"} />
        </div>
        <div className="container">
          <div>
            <ul className="flex gap-1">
              <li>
                <a
                  href="index.html"
                  className="text-lg text-blackColor2 dark:text-blackColor2-dark"
                >
                  Home <i className="icofont-simple-right"></i>
                </a>
              </li>
              <li>
                <span className="text-lg text-blackColor2 dark:text-blackColor2-dark">
                  Course-Details
                </span>
              </li>
            </ul>
            <div className="pt-70px">
              {/* For type 3, show dynamic course content with full-width video */}
              {type === 3 && course ? (
                <>
                  {/* Category, Program Type buttons and Last Update - Full width */}
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

                  {/* Title - Full width */}
                  <h4
                    className="text-size-32 md:text-4xl font-bold text-blackColor dark:text-blackColor-dark mb-30px leading-43px md:leading-14.5"
                    data-aos="fade-up"
                  >
                    {course.title || "--"}
                  </h4>

                  {/* Full-width video container */}
                  {course.introVideoUrl ? (
                    <div className="overflow-hidden relative mb-5 aspect-video w-full">
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
                      {/* Play button overlay with animation */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-40 transition-all cursor-pointer">
                        <button
                          onClick={() => setIsVideoModalOpen(true)}
                          className="relative w-15 h-15 md:h-20 md:w-20 lg:w-15 lg:h-15 2xl:h-70px 2xl:w-70px 3xl:h-20 3xl:w-20 bg-secondaryColor rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200"
                          aria-label="Play intro video"
                        >
                          <span className="animate-buble absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 block w-[180px] h-[180px] border-secondaryColor rounded-full"></span>
                          <span className="animate-buble2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 block w-[180px] h-[180px] border-secondaryColor rounded-full"></span>
                          <i className="icofont-play text-2xl text-whiteColor ml-1"></i>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden relative mb-5 aspect-video w-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
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
                  )}
                </>
              ) : (
                /* Hide mock course content for other types - real data is shown in CourseDetailsPrimary */
                type !== 3 && (
                  <>
                    <div
                      className="flex items center gap-6 mb-30px"
                      data-aos="fade-up"
                    >
                      <button className="text-sm text-whiteColor bg-primaryColor border border-primaryColor px-26px py-0.5 leading-23px font-semibold hover:text-primaryColor hover:bg-whiteColor rounded inline-block dark:hover:bg-whiteColor-dark dark:hover:text-whiteColor">
                        Featured
                      </button>
                      <button className="text-sm text-whiteColor bg-indigo border border-indigo px-22px py-0.5 leading-23px font-semibold hover:text-indigo hover:bg-whiteColor rounded inline-block dark:hover:bg-whiteColor-dark dark:hover:text-indigo">
                        Ux Design
                      </button>
                    </div>
                    {/* titile */}
                    <h4
                      className="text-size-32 md:text-4xl font-bold text-blackColor dark:text-blackColor-dark mb-15px leading-43px md:leading-14.5"
                      data-aos="fade-up"
                    >
                      Making Music with Other People
                    </h4>
                    {/* price and rating */}
                    <div
                      className="flex gap-5 flex-wrap items-center mb-30px"
                      data-aos="fade-up"
                    >
                      <div className="flex items-center">
                        <div>
                          <i className="icofont-book-alt pr-5px text-primaryColor text-sm"></i>
                        </div>
                        <div>
                          <span className="text-sm text-black dark:text-blackColor-dark font medium">
                            23 Lesson
                          </span>
                        </div>
                      </div>
                      <div className="text-start md:text-end">
                        <i className="icofont-star text-size-15 text-yellow"></i>{" "}
                        <i className="icofont-star text-size-15 text-yellow"></i>{" "}
                        <i className="icofont-star text-size-15 text-yellow"></i>{" "}
                        <i className="icofont-star text-size-15 text-yellow"></i>{" "}
                        <i className="icofont-star text-size-15 text-yellow"></i>{" "}
                        <span className="text-xs text-blackColor dark:text-blackColor-dark">
                          (44)
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-contentColor dark:text-contentColor-dark font-medium">
                          Last Update:{" "}
                          <span className="text-blackColor dark:text-blackColor-dark">
                            Sep 29, 2024
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* thumbnail */}
                    {type === 3 ? (
                      <div className="overflow-hidden relative mb-5">
                        <Image src={blogImage7} alt="" className="w-full" />
                        <div className="absolute top-0 right-0 left-0 bottom-0 flex items-center justify-center z-10">
                          <PopupVideo />
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                  </>
                )
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Video Modal - Only render for type 3 with course intro video */}
      {type === 3 && course?.introVideoUrl && (
        <CourseIntroVideoModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          videoUrl={course.introVideoUrl}
        />
      )}
    </section>
  );
};

export default HeroPrimary2;
