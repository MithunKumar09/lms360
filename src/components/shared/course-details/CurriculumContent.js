"use client";

import React from "react";
import accordions from "@/libs/accordions";
import Link from "next/link";
import { useEffect } from "react";
import { formatDuration, calculateModuleDuration } from "@/lib/utils/durationFormatter";
import { useRouter } from "next/navigation";

const CurriculumContent = ({ modules = [], courseId }) => {
  const router = useRouter();

  useEffect(() => {
    accordions();
  }, [modules]);

  // Get lesson type icon
  const getLessonTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return 'icofont-video-alt';
      case 'text':
        return 'icofont-file-text';
      case 'quiz':
        return 'icofont-file-text';
      case 'assignment':
        return 'icofont-file-alt';
      case 'material':
        return 'icofont-file-document';
      default:
        return 'icofont-video-alt';
    }
  };

  // Get lesson type label
  const getLessonTypeLabel = (type) => {
    switch (type) {
      case 'video':
        return 'Video';
      case 'text':
        return 'Text';
      case 'quiz':
        return 'Quiz';
      case 'assignment':
        return 'Assignment';
      case 'material':
        return 'Material';
      default:
        return 'Lesson';
    }
  };

  // Handle preview button click
  const handlePreview = (lessonId, e) => {
    e.preventDefault();
    if (courseId && lessonId) {
      router.push(`/lessons/1?courseId=${courseId}&lessonId=${lessonId}`);
    }
  };

  // If no modules, show empty state
  if (!modules || modules.length === 0) {
    return (
      <div>
        <p className="text-contentColor dark:text-contentColor-dark text-center py-10">
          No curriculum available
        </p>
      </div>
    );
  }

  // Sort modules by order
  const sortedModules = [...modules].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div>
      <ul className="accordion-container curriculum">
        {sortedModules.map((module, moduleIndex) => {
          // Calculate module duration
          const moduleDuration = calculateModuleDuration(modules, module.id);
          const formattedDuration = formatDuration(moduleDuration);

          // Sort chapters by order
          const sortedChapters = [...(module.chapters || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

          // Determine if this is first, last, or middle module for styling
          const isFirst = moduleIndex === 0;
          const isLast = moduleIndex === sortedModules.length - 1;
          const roundedClass = isFirst ? 'rounded-t-md' : isLast ? 'rounded-b-md' : '';

          return (
            <li
              key={module.id}
              className={`accordion mb-25px overflow-hidden ${isFirst ? 'active' : ''}`}
            >
              <div className={`bg-whiteColor border border-borderColor dark:bg-whiteColor-dark dark:border-borderColor-dark ${roundedClass}`}>
                {/* controller  */}
                <div>
                  <div className="cursor-pointer accordion-controller flex justify-between items-center text-xl text-headingColor font-bold w-full px-5 py-18px dark:text-headingColor-dark font-hind leading-[20px]">
                    <div className="flex items-center">
                      <span>{module.title || `Module ${moduleIndex + 1}`}</span>
                      {formattedDuration && (
                        <p className="text-xs text-headingColor dark:text-headingColor-dark px-10px py-0.5 ml-10px bg-borderColor dark:bg-borderColor-dark rounded-full">
                          {formattedDuration}
                        </p>
                      )}
                    </div>
                    <svg
                      className="transition-all duration-500 rotate-0"
                      width="20"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="#212529"
                    >
                      <path
                        fillRule="evenodd"
                        d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                      ></path>
                    </svg>
                  </div>
                </div>
                {/* content  */}
                <div className={`accordion-content transition-all duration-500 ${isFirst ? '' : 'h-0'}`}>
                  <div className="content-wrapper p-10px md:px-30px">
                    {sortedChapters.length > 0 ? (
                      <ul>
                        {sortedChapters.map((chapter, chapterIndex) => {
                          // Sort lessons by order
                          const sortedLessons = [...(chapter.lessons || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
                          const isLastChapter = chapterIndex === sortedChapters.length - 1;

                          return (
                            <React.Fragment key={chapter.id}>
                              {/* Chapter title if there are multiple chapters */}
                              {sortedChapters.length > 1 && (
                                <li className="py-10px border-b border-borderColor dark:border-borderColor-dark">
                                  <h5 className="text-base font-semibold text-blackColor dark:text-blackColor-dark">
                                    {chapter.title || `Chapter ${chapterIndex + 1}`}
                                  </h5>
                                </li>
                              )}
                              {/* Lessons */}
                              {sortedLessons.map((lesson, lessonIndex) => {
                                const isLastLesson = lessonIndex === sortedLessons.length - 1 && isLastChapter;
                                const lessonDuration = lesson.duration || 0;
                                const formattedLessonDuration = lessonDuration > 0 ? `${lessonDuration} minutes` : '';

                                return (
                                  <li
                                    key={lesson.id}
                                    className={`${isLastLesson ? 'py-15px' : 'py-4'} flex items-center justify-between flex-wrap ${!isLastLesson ? 'border-b border-borderColor dark:border-borderColor-dark' : ''}`}
                                  >
                                    <div>
                                      <h4 className="text-blackColor dark:text-blackColor-dark leading-1 font-light">
                                        <i className={`${getLessonTypeIcon(lesson.type)} mr-10px`}></i>
                                        <span className="font-medium">{getLessonTypeLabel(lesson.type)} :</span>
                                        {lesson.title || `Lesson ${lessonIndex + 1}`}
                                      </h4>
                                    </div>
                                    <div className="text-blackColor dark:text-blackColor-dark text-sm flex items-center">
                                      {formattedLessonDuration && (
                                        <p className="mr-5">
                                          <i className="icofont-clock-time"></i> {formattedLessonDuration}
                                        </p>
                                      )}
                                      {courseId && lesson.id && (
                                        <Link
                                          href={`/lessons/1?courseId=${courseId}&lessonId=${lesson.id}`}
                                          onClick={(e) => handlePreview(lesson.id, e)}
                                          className="bg-primaryColor text-whiteColor text-sm ml-5 rounded py-0.5 hover:bg-secondaryColor transition-colors"
                                        >
                                          <p className="px-10px">
                                            <i className="icofont-eye"></i> Preview
                                          </p>
                                        </Link>
                                      )}
                                      {(!courseId || !lesson.id) && (
                                        <p className="text-contentColor dark:text-contentColor-dark">
                                          <i className="icofont-lock"></i>
                                        </p>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-contentColor dark:text-contentColor-dark py-4 text-center">
                        No lessons in this module
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CurriculumContent;
