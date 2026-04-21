/**
 * Course Card Component
 * 
 * Expandable course card for the Assign Course feature.
 * Shows minimal details when collapsed, full details when expanded.
 */

'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import Image from 'next/image';
import useAssignCourseStore from '@/store/assignCourseStore.js';
import CourseCardExpanded from './CourseCardExpanded.js';
import VideoModal from './VideoModal.js';

const CourseCard = ({ course }) => {
  const toggleCourseExpansion = useAssignCourseStore(
    (state) => state.toggleCourseExpansion
  );
  // Subscribe to expandedCourses directly so component re-renders when it changes
  const expandedCourses = useAssignCourseStore((state) => state.expandedCourses);
  const openAssignModal = useAssignCourseStore((state) => state.openAssignModal);

  const [showVideoModal, setShowVideoModal] = useState(false);

  // Check if this course is expanded
  const isExpanded = Array.isArray(expandedCourses)
    ? expandedCourses.includes(course.id)
    : false;

  // Memoize course data processing (expensive operations)
  const courseData = useMemo(() => {
    const title = course?.title || 'Untitled Course';
    const description = course?.description || course?.aboutUs || '';
    const introVideo = course?.introVideo || course?.intro_video || null;
    const coverImage =
      course?.coverImage ||
      course?.cover_image ||
      course?.thumbnailUrl ||
      course?.thumbnail_url ||
      null;
    const instructor = course?.instructor || { id: null, name: 'Unknown' };
    const cohorts = course?.cohorts || [];
    const classes = course?.classes || [];
    const subjects = course?.subjects || [];
    const createdAt = course?.createdAt || course?.created_at || '';

    // Truncate description to 150 characters
    const truncatedDescription =
      description.length > 150 ? `${description.substring(0, 150)}...` : description;

    // Format date
    const formattedDate = createdAt
      ? new Date(createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '';

    return {
      title,
      description,
      truncatedDescription,
      introVideo,
      coverImage,
      instructor,
      cohorts,
      classes,
      subjects,
      formattedDate,
    };
  }, [course]);

  // Memoize handlers to prevent unnecessary re-renders
  const handleExpand = useCallback(() => {
    toggleCourseExpansion(course.id);
  }, [course.id, toggleCourseExpansion]);

  const handleAssign = useCallback(() => {
    openAssignModal(course.id);
  }, [course.id, openAssignModal]);

  const handlePlayVideo = useCallback(
    (e) => {
      e.stopPropagation();
      if (courseData.introVideo) {
        setShowVideoModal(true);
      }
    },
    [courseData.introVideo]
  );

  return (
    <>
      <div
        className="border border-borderColor dark:border-borderColor-dark rounded-lg overflow-hidden bg-whiteColor dark:bg-whiteColor-dark shadow-sm hover:shadow-md transition-all duration-300 ease-in-out"
        role="article"
        aria-label={`Course: ${courseData.title}`}
      >
        {/* Collapsed State */}
        <div
          className="p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={handleExpand}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-controls={`course-expanded-${course.id}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleExpand();
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                {courseData.title}
              </h3>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                {courseData.instructor.name && (
                  <span>
                    <strong>Instructor:</strong> {courseData.instructor.name}
                  </span>
                )}
                {courseData.cohorts.length > 0 && (
                  <span>
                    <strong>Cohorts:</strong> {courseData.cohorts.join(', ')}
                  </span>
                )}
                {courseData.classes.length > 0 && (
                  <span>
                    <strong>Classes:</strong> {courseData.classes.join(', ')}
                  </span>
                )}
                {courseData.subjects.length > 0 && (
                  <span>
                    <strong>Subjects:</strong> {courseData.subjects.join(', ')}
                  </span>
                )}
                {courseData.formattedDate && (
                  <span>
                    <strong>Created:</strong> {courseData.formattedDate}
                  </span>
                )}
              </div>
            </div>
            <div className="ml-4">
              <button
                className={`transform transition-transform duration-300 ease-in-out ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleExpand();
                }}
                aria-label={isExpanded ? 'Collapse course details' : 'Expand course details'}
              >
                <svg
                  className="w-6 h-6 text-gray-600 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Expanded State */}
        {isExpanded && (
          <div
            id={`course-expanded-${course.id}`}
            className="border-t border-borderColor dark:border-borderColor-dark animate-slide-down"
            role="region"
            aria-label={`Expanded details for ${courseData.title}`}
          >
            <CourseCardExpanded
              course={course}
              title={courseData.title}
              description={courseData.description}
              truncatedDescription={courseData.truncatedDescription}
              introVideo={courseData.introVideo}
              coverImage={courseData.coverImage}
              onPlayVideo={handlePlayVideo}
              onAssign={handleAssign}
            />
          </div>
        )}
      </div>

      {/* Video Modal */}
      {showVideoModal && courseData.introVideo && (
        <VideoModal
          videoUrl={courseData.introVideo}
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
        />
      )}
    </>
  );
};

// Note: Not using memo here because we need to re-render when store state (expandedCourses) changes
// The store hooks will handle re-rendering when needed
export default CourseCard;

