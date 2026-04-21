"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FiPlayCircle } from 'react-icons/fi';
import useRecommendedMiniCourses from '@/hooks/api/useRecommendedMiniCourses';
import QuizSkeletonCard from '@/components/quiz/states/QuizSkeletonCard';
import QuizListEmptyState from '@/components/quiz/states/QuizListEmptyState';
import PrimaryButton from '@/components/quiz/buttons/PrimaryButton';

const RecommendedMiniCoursesSection = ({ className = '' }) => {
  const router = useRouter();

  const { data, isLoading, error } = useRecommendedMiniCourses({
    recommended: true,
    limit: 10,
  });

  const miniCourses = data?.miniCourses || [];

  const handleStartQuiz = (miniCourseId) => {
    // Navigate to quiz attempt page for the mini course quiz
    router.push(`/student/quiz-attempt?miniCourseId=${miniCourseId}`);
  };

  return (
    <div className={`mb-8 ${className}`}>
      <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-6">
        Recommended Mini Courses
      </h2>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <QuizSkeletonCard count={4} />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          Error loading mini courses: {error.message}
        </div>
      ) : miniCourses.length === 0 ? (
        <QuizListEmptyState message="No recommended mini courses available at the moment." />
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-6 pb-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {miniCourses.map((miniCourse) => (
              <div
                key={miniCourse.id}
                className="flex-shrink-0 w-72 md:w-auto bg-whiteColor dark:bg-darkdeep3-dark shadow-lg rounded-lg overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
              >
                {/* Cover Image */}
                <div className="w-full h-40 relative">
                  <Image
                    src={miniCourse.coverPhotoUrl || '/images/mini-course-placeholder.jpg'}
                    alt={miniCourse.title}
                    fill
                    sizes="(max-width: 768px) 288px, (max-width: 1200px) 33vw, 25vw"
                    className="object-cover"
                  />
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-blackColor dark:text-blackColor-dark mb-2 line-clamp-2">
                    {miniCourse.title}
                  </h3>
                  <p className="text-sm text-contentColor dark:text-contentColor-dark mb-4 line-clamp-3">
                    {miniCourse.description || 'No description available.'}
                  </p>
                  <PrimaryButton
                    onClick={() => handleStartQuiz(miniCourse.id)}
                    icon={FiPlayCircle}
                    size="sm"
                    fullWidth
                  >
                    Start Quiz
                  </PrimaryButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendedMiniCoursesSection;

