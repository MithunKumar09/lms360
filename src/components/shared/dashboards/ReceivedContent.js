'use client';

import React from 'react';
import { useDashboardReviews } from '@/hooks/api/useDashboardReviews';
import { useAuthStore } from '@/store/index.js';
import { useReviewsStore } from '@/store/index.js';
import { formatDateShort } from '@/lib/utils/dateFormatter';
import ReviewsTableSkeleton from '../loading/ReviewsTableSkeleton';

/**
 * Render star rating
 */
const renderStars = (rating) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < fullStars; i++) {
    stars.push(<i key={`full-${i}`} className="icofont-star text-primaryColor"></i>);
  }
  if (hasHalfStar) {
    stars.push(<i key="half" className="icofont-star-half text-primaryColor"></i>);
  }
  while (stars.length < 5) {
    stars.push(<i key={`empty-${stars.length}`} className="icofont-star text-primaryColor opacity-30"></i>);
  }
  return stars;
};

const ReceivedContent = () => {
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, isError, error } = useDashboardReviews();
  const { toggleReview, isExpanded } = useReviewsStore();

  // Loading state
  if (isLoading) {
    return <ReviewsTableSkeleton rows={5} />;
  }

  // Error state
  if (isError) {
    return (
      <div className="text-center py-10 text-red-500">
        <p>Error loading reviews: {error?.message || 'Unknown error'}</p>
      </div>
    );
  }

  const reviews = data?.reviews || [];
  const courseReviewsMap = data?.courseReviewsMap || {};

  // Empty state
  const isAdmin = user?.role === 'admin';
  const hasData = isAdmin 
    ? Object.keys(courseReviewsMap).length > 0 
    : reviews.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-20">
        <div className="mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto text-gray-400"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </div>
        <p className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-2">
          No Reviews Yet
        </p>
        <p className="text-contentColor dark:text-contentColor-dark">
          You haven&apos;t received any reviews for your courses yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-left">
        <thead className="text-sm md:text-base text-blackColor dark:text-blackColor-dark bg-lightGrey5 dark:bg-whiteColor-dark leading-1.8 md:leading-1.8">
          <tr>
            {isAdmin && <th className="px-5px py-10px md:px-5">Course</th>}
            {isAdmin && <th className="px-5px py-10px md:px-5">Instructor</th>}
            <th className="px-5px py-10px md:px-5">Student</th>
            <th className="px-5px py-10px md:px-5">Date</th>
            <th className="px-5px py-10px md:px-5">Feedback</th>
          </tr>
        </thead>
        <tbody className="text-size-13 md:text-base text-contentColor dark:text-contentColor-dark font-normal">
          {isAdmin ? (
            // Admin view: Grouped by course
            (() => {
              const rows = [];
              let globalIndex = 0;
              
              Object.entries(courseReviewsMap).forEach(([courseId, courseData], courseIndex) => {
                const course = courseData.course;
                const courseReviews = courseData.reviews || [];
                
                courseReviews.forEach((review, reviewIndex) => {
                  const rowKey = `${courseId}-${review.id}`;
                  const isReviewExpanded = isExpanded(rowKey);
                  const isFirstInGroup = reviewIndex === 0;

                  rows.push(
                    <tr
                      key={rowKey}
                      className={`leading-1.8 md:leading-1.8 ${
                        globalIndex % 2 === 1
                          ? 'bg-lightGrey5 dark:bg-whiteColor-dark'
                          : ''
                      }`}
                    >
                      {isFirstInGroup && (
                        <>
                          <th
                            className="px-5px py-10px md:px-5 font-normal"
                            rowSpan={courseReviews.length}
                          >
                            <p className="text-blackColor dark:text-blackColor-dark text-nowrap">
                              {course?.title || 'Unknown Course'}
                            </p>
                          </th>
                          <th
                            className="px-5px py-10px md:px-5 font-normal"
                            rowSpan={courseReviews.length}
                          >
                            <p className="text-blackColor dark:text-blackColor-dark text-nowrap">
                              {course?.instructor?.name || course?.instructor?.email || 'N/A'}
                            </p>
                          </th>
                        </>
                      )}
                      <th className="px-5px py-10px md:px-5 font-normal">
                        <p className="text-blackColor dark:text-blackColor-dark text-nowrap">
                          {review.user?.name || review.user?.email || 'Anonymous'}
                        </p>
                      </th>
                      <td className="px-5px py-10px md:px-5 text-nowrap">
                        <p>{formatDateShort(review.createdAt)}</p>
                      </td>
                      <td className="px-5px py-10px md:px-5">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="text-primaryColor mb-1">
                              {renderStars(review.rating)}
                              <span className="md:text-sm text-blackColor dark:text-blackColor-dark font-bold ml-1">
                                ({review.rating}/5)
                              </span>
                            </div>
                            {review.reviewText ? (
                              <div>
                                {isReviewExpanded || review.reviewText.length <= 100 ? (
                                  <p className="text-blackColor dark:text-blackColor-dark">
                                    {review.reviewText}
                                  </p>
                                ) : (
                                  <>
                                    <p className="text-blackColor dark:text-blackColor-dark">
                                      {review.reviewText.substring(0, 100)}...
                                    </p>
                                    <button
                                      onClick={() => toggleReview(rowKey)}
                                      className="text-primaryColor hover:underline text-sm mt-1"
                                    >
                                      Read more
                                    </button>
                                  </>
                                )}
                                {isReviewExpanded && review.reviewText.length > 100 && (
                                  <button
                                    onClick={() => toggleReview(rowKey)}
                                    className="text-primaryColor hover:underline text-sm mt-1 block"
                                  >
                                    Show less
                                  </button>
                                )}
                              </div>
                            ) : (
                              <p className="text-contentColor dark:text-contentColor-dark">-</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                  globalIndex++;
                });
              });
              
              return rows;
            })()
          ) : (
            // Superadmin and Instructor view: Simple list
            reviews.map((review, index) => {
              const rowKey = `review-${review.id}`;
              const isReviewExpanded = isExpanded(rowKey);
              const course = review.course;

              return (
                <tr
                  key={rowKey}
                  className={`leading-1.8 md:leading-1.8 ${
                    index % 2 === 1 ? 'bg-lightGrey5 dark:bg-whiteColor-dark' : ''
                  }`}
                >
                  <th className="px-5px py-10px md:px-5 font-normal">
                    <p className="text-blackColor dark:text-blackColor-dark text-nowrap">
                      {review.user?.name || review.user?.email || 'Anonymous'}
                    </p>
                  </th>
                  <td className="px-5px py-10px md:px-5 text-nowrap">
                    <p>{formatDateShort(review.createdAt)}</p>
                  </td>
                  <td className="px-5px py-10px md:px-5">
                    <p className="md:text-size-15 text-blackColor dark:text-blackColor-dark font-bold mb-1">
                      Course: {course?.title || 'Unknown Course'}
                    </p>
                    <div>
                      <div className="text-primaryColor mb-1">
                        {renderStars(review.rating)}
                        <span className="md:text-sm text-blackColor dark:text-blackColor-dark font-bold ml-1">
                          ({review.rating}/5)
                        </span>
                      </div>
                      {review.reviewText ? (
                        <div>
                          {isReviewExpanded || review.reviewText.length <= 100 ? (
                            <p className="text-blackColor dark:text-blackColor-dark">
                              {review.reviewText}
                            </p>
                          ) : (
                            <>
                              <p className="text-blackColor dark:text-blackColor-dark">
                                {review.reviewText.substring(0, 100)}...
                              </p>
                              <button
                                onClick={() => toggleReview(rowKey)}
                                className="text-primaryColor hover:underline text-sm mt-1"
                              >
                                Read more
                              </button>
                            </>
                          )}
                          {isReviewExpanded && review.reviewText.length > 100 && (
                            <button
                              onClick={() => toggleReview(rowKey)}
                              className="text-primaryColor hover:underline text-sm mt-1 block"
                            >
                              Show less
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-contentColor dark:text-contentColor-dark">-</p>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ReceivedContent;
