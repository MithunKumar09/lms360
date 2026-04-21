"use client";

import { useState } from "react";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import { useInstructorReviews } from "@/hooks/api/useInstructorReviews";
import { useAuthStore } from "@/store/index.js";
import LoadingSpinner from "@/components/shared/loading/LoadingSpinner";
import { formatDateShort } from "@/lib/utils/dateFormatter";

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

const AdminFeedbacks = () => {
  const user = useAuthStore((state) => state.user);
  const instructorId = user?.id;
  const [page, setPage] = useState(1);
  const limit = 10;

  // Fetch instructor reviews
  const { data: reviewsData, isLoading, isError, error, refetch } = useInstructorReviews(
    instructorId,
    { page, limit, enabled: !!instructorId }
  );

  const reviews = reviewsData?.reviews || [];
  const pagination = reviewsData?.pagination || { total: 0, hasMore: false };
  const statistics = reviewsData?.statistics || { totalReviews: 0 };

  // Truncate feedback text for display
  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 max-h-137.5 overflow-auto">
      <div className="flex justify-between items-center mb-20px">
        <HeadingDashboard>Total Feedbacks</HeadingDashboard>
        {statistics.totalReviews > 0 && (
          <span className="text-sm text-contentColor dark:text-contentColor-dark">
            {statistics.totalReviews} {statistics.totalReviews === 1 ? 'review' : 'reviews'}
          </span>
        )}
      </div>

      {!instructorId ? (
        <div className="text-center py-50px text-contentColor dark:text-contentColor-dark">
          <p className="text-sm">Unable to load feedbacks. Please refresh the page.</p>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-50px">
          <LoadingSpinner size="lg" color="blue" />
          <p className="text-sm text-contentColor dark:text-contentColor-dark mt-15px">
            Loading feedbacks...
          </p>
        </div>
      ) : isError ? (
        <div className="text-center py-50px text-contentColor dark:text-contentColor-dark">
          <div className="mb-15px">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-red-500 mx-auto mb-10px"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-500 mb-10px font-semibold">Failed to load feedbacks</p>
            <p className="text-sm mb-20px">{error?.message || 'Unknown error occurred. Please try again.'}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="text-size-15 text-whiteColor bg-primaryColor px-25px py-10px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor rounded transition-all"
          >
            Retry
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-50px text-contentColor dark:text-contentColor-dark">
          <p>No feedbacks yet</p>
          <p className="text-sm mt-5px">Students haven&apos;t submitted any feedback yet.</p>
        </div>
      ) : (
        <>
      <div className="overflow-auto">
        <table className="w-full text-left text-nowrap">
          <thead className="text-sm md:text-base text-blackColor dark:text-blackColor-dark bg-lightGrey5 dark:bg-whiteColor-dark leading-1.8 md:leading-1.8">
            <tr>
                  <th className="px-5px py-10px md:px-5">Student Name</th>
              <th className="px-5px py-10px md:px-5">Rating</th>
                  <th className="px-5px py-10px md:px-5">Feedback</th>
                  <th className="px-5px py-10px md:px-5">Date</th>
            </tr>
          </thead>
          <tbody className="text-size-13 md:text-base text-contentColor dark:text-contentColor-dark font-normal">
                {Array.isArray(reviews) && reviews.map((review, index) => {
                  if (!review || typeof review !== 'object') {
                    return null;
                  }
                  return (
                    <tr
                      key={review.id || index}
                      className={`leading-1.8 md:leading-1.8 ${
                        index % 2 === 1 ? 'bg-lightGrey5 dark:bg-whiteColor-dark' : ''
                      }`}
                    >
                      <td className="px-5px py-10px md:px-5 font-normal">
                        <div className="flex items-center gap-10px">
                          {review.student?.photoUrl ? (
                            <img
                              src={review.student.photoUrl}
                              alt={review.student?.name || 'Student'}
                              className="w-30px h-30px rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-30px h-30px rounded-full bg-primaryColor/20 flex items-center justify-center">
                              <span className="text-xs text-primaryColor font-semibold">
                                {review.student?.name?.charAt(0)?.toUpperCase() || 'S'}
                              </span>
                            </div>
                          )}
                          <span>{review.student?.name || 'Anonymous'}</span>
                        </div>
                      </td>
                      <td className="px-5px py-10px md:px-5">
                        <div className="text-primaryColor">
                          {renderStars(typeof review.rating === 'number' ? review.rating : 0)}
                        </div>
                      </td>
                      <td className="px-5px py-10px md:px-5">
                        {review.feedbackText ? (
                          <div className="max-w-300px">
                            <p className="truncate" title={review.feedbackText}>
                              {truncateText(review.feedbackText, 80)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-contentColor dark:text-contentColor-dark opacity-50 italic">
                            No feedback text
                          </span>
                        )}
                      </td>
                      <td className="px-5px py-10px md:px-5">
                        <span className="text-xs text-contentColor dark:text-contentColor-dark">
                          {review.createdAt ? formatDateShort(review.createdAt) : '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

          {/* Pagination */}
          {pagination && typeof pagination.totalPages === 'number' && pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-20px pt-20px border-t border-borderColor dark:border-borderColor-dark">
              <div className="text-sm text-contentColor dark:text-contentColor-dark">
                Page {page} of {pagination.totalPages} ({pagination.total || 0} total)
              </div>
              <div className="flex gap-10px">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent px-15px py-5px border border-borderColor dark:border-borderColor-dark rounded hover:bg-lightGrey5 dark:hover:bg-darkdeep1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                  disabled={!pagination.hasMore}
                  className="text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent px-15px py-5px border border-borderColor dark:border-borderColor-dark rounded hover:bg-lightGrey5 dark:hover:bg-darkdeep1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminFeedbacks;
