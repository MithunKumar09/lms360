'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLesson, useUpdateWatchProgress } from '@/hooks/api/useLesson';
import { useCourseDetails } from '@/hooks/api/useCourseDetails';
import LessonAccordion from '@/components/shared/lessons/LessonAccordion';
import VideoPlayer from '@/components/shared/lessons/VideoPlayer';
import TranscriptSection from '@/components/shared/lessons/TranscriptSection';
import { formatDuration } from '@/lib/utils/durationFormatter';
import apiClient from '@/lib/api/client.js';

const LessonPrimary = ({ id, courseId, lessonId }) => {
  const router = useRouter();
  const [watchInterval, setWatchInterval] = useState(null);
  const [currentWatchTime, setCurrentWatchTime] = useState(0);
  const [isTracking, setIsTracking] = useState(false);

  // Fetch lesson data
  const { data: lessonData, isLoading, isError, error } = useLesson(courseId, lessonId);
  const lesson = lessonData?.lesson;

  // Fetch course data for curriculum
  const { data: course, isLoading: isLoadingCourse, isError: isCourseError, error: courseError } = useCourseDetails(courseId, {
    enabled: !!courseId
  });

  // Debug logging
  React.useEffect(() => {
    if (course) {
      console.log('📚 [LessonPrimary] Course loaded:', {
        courseId,
        hasModules: !!course.modules,
        modulesCount: course.modules?.length || 0,
        modules: course.modules
      });
    }
    if (isCourseError) {
      console.error('❌ [LessonPrimary] Course fetch error:', courseError);
    }
  }, [course, isCourseError, courseError, courseId]);

  // Watch progress mutation
  const updateWatchProgress = useUpdateWatchProgress();

  // Track watch duration when video is playing
  useEffect(() => {
    if (!lesson || !isTracking) {
      if (watchInterval) {
        clearInterval(watchInterval);
        setWatchInterval(null);
      }
      return;
    }

    const interval = setInterval(() => {
      setCurrentWatchTime(prev => {
        const newTime = prev + 1; // Increment by 1 second
        return newTime;
      });
    }, 1000);

    setWatchInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lesson, isTracking]);

  // Save watch progress periodically (every 10 seconds)
  useEffect(() => {
    if (!lesson || !courseId || !lessonId || currentWatchTime === 0) return;
    if (currentWatchTime % 10 !== 0) return; // Only save every 10 seconds

    const totalDuration = lesson.duration || 0;
    const completed = currentWatchTime >= totalDuration * 0.9; // 90% watched = completed

    updateWatchProgress.mutate({
      courseId,
      lessonId,
      watchDuration: currentWatchTime,
      totalDuration,
      completed
    });
  }, [currentWatchTime, lesson, courseId, lessonId, updateWatchProgress]);

  // Check for milestone completion when lesson is completed
  useEffect(() => {
    const checkMilestone = async () => {
      if (lesson?.watchProgress?.completed && courseId && lessonId) {
        try {
          // Check for milestone completion via API
          const response = await apiClient.post('/students/roadmap/milestones/check', {
            courseId,
            triggerType: 'lesson',
            triggerId: lessonId,
          });

          if (response.success && response.completedMilestones && response.completedMilestones.length > 0) {
            // Milestone completed - this will be handled by the celebration manager
            // The milestone completion will trigger celebration automatically
          }
        } catch (error) {
          console.error('Error checking milestones after lesson completion:', error);
        }
      }
    };

    checkMilestone();
  }, [lesson?.watchProgress?.completed, courseId, lessonId]);

  // Initialize watch time from existing progress
  useEffect(() => {
    if (lesson?.watchProgress) {
      setCurrentWatchTime(lesson.watchProgress.watchDuration || 0);
    }
  }, [lesson]);

  const handleVideoPlay = () => {
    setIsTracking(true);
  };

  const handleVideoPause = () => {
    setIsTracking(false);
  };

  const handleVideoProgress = (state) => {
    // For YouTube iframe, we track time manually via interval
    // This callback can be used for more accurate tracking if using a proper video player
    if (isTracking && state.playedSeconds) {
      setCurrentWatchTime(Math.floor(state.playedSeconds));
    }
  };

  const handleVideoDuration = (duration) => {
    // Duration is already set in lesson data
  };

  // Navigation handlers
  const handleNextLesson = () => {
    if (lesson?.nextLesson) {
      router.push(`/lessons/1?courseId=${courseId}&lessonId=${lesson.nextLesson.id}`);
    }
  };

  const handlePreviousLesson = () => {
    if (lesson?.previousLesson) {
      router.push(`/lessons/1?courseId=${courseId}&lessonId=${lesson.previousLesson.id}`);
    }
  };

  // Loading state
  if (isLoading || isLoadingCourse) {
    return (
      <section>
        <div className="container-fluid-2 pt-50px pb-100px">
          <div className="text-center py-20">
            <p className="text-contentColor dark:text-contentColor-dark">Loading lesson...</p>
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (isError || !lesson) {
    return (
      <section>
        <div className="container-fluid-2 pt-50px pb-100px">
          <div className="text-center py-20">
            <p className="text-red-500">
              {error?.message || 'Lesson not found'}
            </p>
            {courseId && (
              <Link 
                href={`/course-details-3?courseId=${courseId}`}
                className="text-primaryColor hover:underline mt-5 inline-block"
              >
                Back to Course
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Lesson duration is in seconds from the API, convert to minutes for formatting
  const lessonDurationSeconds = lesson.duration || 0;
  const lessonDurationMinutes = Math.floor(lessonDurationSeconds / 60);
  const formattedDuration = formatDuration(lessonDurationMinutes);

  return (
    <section>
      <div className="container-fluid-2 pt-50px pb-100px">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-30px">
          {/* Lesson Left - Curriculum */}
          <div className="xl:col-start-1 xl:col-span-4" data-aos="fade-up">
            {isCourseError && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-4 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Unable to load course curriculum. {courseError?.message || 'Please refresh the page.'}
                </p>
              </div>
            )}
            <LessonAccordion courseId={courseId} modules={course?.modules || []} currentLessonId={lessonId} />
          </div>

          {/* Lesson Right - Video Content */}
          <div className="xl:col-start-5 xl:col-span-8 relative" data-aos="fade-up">
            <div>
              {/* Header */}
              <div className="absolute top-0 left-0 w-full flex justify-between items-center px-5 py-10px bg-primaryColor leading-1.2 text-whiteColor z-20">
                <h3 className="sm:text-size-22 font-bold">
                  {lesson.title || 'Lesson'}
                </h3>
                <Link 
                  href={courseId ? `/course-details-3?courseId=${courseId}` : '/courses'}
                  className="hover:underline"
                >
                  Close
                </Link>
              </div>

              {/* Video Player */}
              <div className="mt-50px">
                <VideoPlayer
                  videoUrl={lesson.videoUrl}
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onProgress={handleVideoProgress}
                  onDuration={handleVideoDuration}
                />
              </div>

              {/* Lesson Info */}
              <div className="mt-30px p-5 bg-whiteColor dark:bg-whiteColor-dark rounded shadow">
                <div className="flex flex-wrap gap-4 items-center mb-15px">
                  <div className="flex items-center gap-2">
                    <i className="icofont-clock-time text-primaryColor"></i>
                    <span className="text-sm text-contentColor dark:text-contentColor-dark">
                      Duration: {formattedDuration}
                    </span>
                  </div>
                  {lesson.watchProgress && (
                    <div className="flex items-center gap-2">
                      <i className="icofont-eye text-primaryColor"></i>
                      <span className="text-sm text-contentColor dark:text-contentColor-dark">
                        Watched: {formatDuration(Math.floor(lesson.watchProgress.watchDuration / 60))} / {formattedDuration}
                      </span>
                    </div>
                  )}
                </div>
                {lesson.description && (
                  <p className="text-contentColor dark:text-contentColor-dark leading-26px">
                    {lesson.description}
                  </p>
                )}
              </div>

              {/* Transcript Section */}
              <TranscriptSection transcript={lesson.transcript} />

              {/* Navigation Buttons */}
              <div className="mt-30px flex gap-4">
                {lesson.previousLesson && (
                  <button
                    onClick={handlePreviousLesson}
                    className="flex-1 text-size-15 text-whiteColor bg-secondaryColor px-25px py-10px border border-secondaryColor hover:text-secondaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-secondaryColor dark:hover:bg-whiteColor-dark"
                  >
                    <i className="icofont-arrow-left mr-2"></i>
                    Previous: {lesson.previousLesson.title}
                  </button>
                )}
                {lesson.nextLesson && (
                  <button
                    onClick={handleNextLesson}
                    className="flex-1 text-size-15 text-whiteColor bg-primaryColor px-25px py-10px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark"
                  >
                    Next: {lesson.nextLesson.title}
                    <i className="icofont-arrow-right ml-2"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LessonPrimary;
