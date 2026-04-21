'use client';

import Image from "next/image";
import React, { useState } from "react";
import { useCourseReviews, useCreateCourseReview } from "@/hooks/api/useCourseReviews";
import { formatDateShort } from "@/lib/utils/dateFormatter";
import teacherImage1 from "@/assets/images/teacher/teacher__1.png";

const ReviewsContent = ({ courseId }) => {
  const [page, setPage] = useState(1);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewerWebsite, setReviewerWebsite] = useState('');

  const { data: reviewsData, isLoading, isError, error } = useCourseReviews(courseId, { page, limit: 10 });
  const createReviewMutation = useCreateCourseReview();

  const reviews = reviewsData?.reviews || [];
  const pagination = reviewsData?.pagination || { hasMore: false, total: 0 };
  const statistics = reviewsData?.statistics || {
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  };

  // Render stars
  const renderStars = (rating, className = '') => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={`full-${i}`} className={`icofont-star text-yellow ${className}`}></i>);
    }
    if (hasHalfStar) {
      stars.push(<i key="half" className={`icofont-star-half text-yellow ${className}`}></i>);
    }
    while (stars.length < 5) {
      stars.push(<i key={`empty-${stars.length}`} className={`icofont-star text-gray-300 ${className}`}></i>);
    }
    return stars;
  };

  // Calculate percentage for rating distribution
  const getRatingPercentage = (count) => {
    if (statistics.totalReviews === 0) return 0;
    return (count / statistics.totalReviews) * 100;
  };

  // Handle Load More button click with tunnel scroll animation
  const handleLoadMore = () => {
    if (pagination.hasMore) {
      setPage(prev => prev + 1);
      // Smooth scroll to reviews section
      setTimeout(() => {
        const reviewsSection = document.getElementById('reviews-list');
        if (reviewsSection) {
          reviewsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  // Handle review submission
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedRating) {
      alert('Please select a rating');
      return;
    }
    if (!courseId) {
      alert('Course ID is required');
      return;
    }

    try {
      await createReviewMutation.mutateAsync({
        courseId,
        rating: selectedRating,
        reviewText: reviewText || null
      });
      // Reset form
      setSelectedRating(0);
      setReviewText('');
      setReviewerWebsite('');
      // Reset to first page to show new review
      setPage(1);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    }
  };

  // Loading state
  if (isLoading && page === 1) {
    return (
      <div className="text-center py-10">
        <p className="text-contentColor dark:text-contentColor-dark">Loading reviews...</p>
      </div>
    );
  }

  // Error state
  if (isError && page === 1) {
    return (
      <div className="text-center py-10 text-red-500">
        <p>Error loading reviews: {error?.message || 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Rating Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-x-30px gap-y-5">
        <div className="lg:col-start-1 lg:col-span-4 px-10px py-30px bg-whiteColor dark:bg-whiteColor-dark shadow-review text-center">
          <p className="text-7xl font-extrabold text-blackColor dark:text-blackColor-dark leading-90px">
            {statistics.averageRating > 0 ? statistics.averageRating.toFixed(1) : '0.0'}
          </p>
          <div className="text-yellow">
            {renderStars(statistics.averageRating)}
          </div>
          <p className="text-blackColor dark:text-blackColor-dark leading-26px font-medium">
            ({statistics.totalReviews} Review{statistics.totalReviews !== 1 ? 's' : ''})
          </p>
        </div>
        {/* Rating Distribution */}
        <div className="lg:col-start-5 lg:col-span-8 px-15px">
          <ul className="flex flex-col gap-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = statistics.ratingDistribution[rating] || 0;
              const percentage = getRatingPercentage(count);
              return (
                <li key={rating} className="flex items-center text-blackColor dark:text-blackColor-dark">
                  <div>
                    <span>{rating}</span>{" "}
                    <span>
                      <i className="icofont-star text-yellow"></i>
                    </span>
                  </div>
                  <div className="flex-grow relative mx-10px md:mr-10 lg:mr-10px">
                    <span className="h-10px w-full bg-borderColor dark:bg-borderColor-dark rounded-full block"></span>
                    <span
                      className="absolute left-0 top-0 h-10px bg-secondaryColor rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></span>
                  </div>
                  <div>
                    <span>{count}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Customer Reviews */}
      <div id="reviews-list" className="mt-60px mb-10">
        <h4 className="text-lg text-blackColor dark:text-blackColor-dark font-bold pl-2 before:w-0.5 relative before:h-[21px] before:bg-secondaryColor before:absolute before:bottom-[5px] before:left-0 leading-1.2 mb-25px">
          Customer Reviews
        </h4>
        {reviews.length === 0 ? (
          <p className="text-contentColor dark:text-contentColor-dark py-10 text-center">
            No reviews yet. Be the first to review this course!
          </p>
        ) : (
          <ul>
            {reviews.map((review, index) => {
              const userPhoto = review.user?.photoUrl || teacherImage1;
              const userName = review.user?.name || review.user?.email || 'Anonymous';
              
              return (
                <li key={review.id} className="flex gap-30px pt-35px border-t border-borderColor2 dark:border-borderColor2-dark">
                  <div className="flex-shrink-0">
                    <div>
                      <Image
                        src={userPhoto}
                        alt={userName}
                        className="w-25 h-25 rounded-full object-cover"
                        width={100}
                        height={100}
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//9k="
                      />
                    </div>
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between">
                      <div>
                        <h4>
                          <a
                            href="#"
                            className="text-lg font-semibold text-blackColor hover:text-secondaryColor dark:text-blackColor-dark dark:hover:text-secondaryColor leading-1.2"
                          >
                            {userName}
                          </a>
                        </h4>
                        <div className="text-yellow leading-1.8">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                      <div className="author__icon">
                        <p className="text-sm font-bold text-blackColor dark:text-blackColor-dark leading-9 px-25px mb-5px border-2 border-borderColor2 dark:border-borderColor2-dark hover:border-secondaryColor dark:hover:border-secondaryColor rounded-full transition-all duration-300">
                          {formatDateShort(review.createdAt)}
                        </p>
                      </div>
                    </div>
                    {review.reviewText && (
                      <p className="text-sm text-contentColor dark:text-contentColor-dark leading-23px mb-15px">
                        {review.reviewText}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Load More Button with Glassy Effect and Tunnel Scroll */}
        {pagination.hasMore && (
          <div className="mt-30px text-center">
            <button
              onClick={handleLoadMore}
              className="relative px-30px py-15px bg-gradient-to-r from-primaryColor/20 to-secondaryColor/20 backdrop-blur-md border border-primaryColor/30 rounded-full text-primaryColor dark:text-primaryColor font-semibold text-sm hover:from-primaryColor/30 hover:to-secondaryColor/30 transition-all duration-300 hover:scale-105 hover:shadow-lg group overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                Load More Reviews
                <i className="icofont-arrow-down group-hover:translate-y-1 transition-transform duration-300"></i>
              </span>
              {/* Tunnel scroll effect overlay */}
              <span className="absolute inset-0 bg-gradient-to-r from-primaryColor/0 via-white/20 to-primaryColor/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
            </button>
          </div>
        )}
      </div>

      {/* Add Review Form */}
      <div className="p-5 md:p-50px mb-50px bg-lightGrey12 dark:bg-transparent dark:shadow-brand-dark">
        <h4
          className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-15px !leading-1.2"
          data-aos="fade-up"
        >
          Add a Review
        </h4>
        <div className="flex gap-15px items-center mb-30px">
          <h6 className="font-bold text-blackColor dark:text-blackColor-dark !leading-[19.2px]">
            Your Ratings:
          </h6>
          <div className="text-yellow leading-1.8">
            {[1, 2, 3, 4, 5].map((rating) => (
              <i
                key={rating}
                className={`icofont-star cursor-pointer transition-colors ${
                  selectedRating >= rating
                    ? 'text-yellow'
                    : 'text-gray-300 hover:text-yellow/70'
                }`}
                onClick={() => setSelectedRating(rating)}
              ></i>
            ))}
          </div>
        </div>
        <form className="pt-5" data-aos="fade-up" onSubmit={handleSubmitReview}>
          <textarea
            placeholder="Type your comments...."
            className="w-full p-5 mb-8 bg-transparent text-sm text-blackColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border border-transparent dark:border-borderColor2-dark placeholder:text-placeholder"
            cols="30"
            rows="6"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
          />
          <div className="grid grid-cols-1 mb-10 gap-10">
            <input
              type="text"
              placeholder="Type your website...."
              className="w-full pl-5 bg-transparent text-sm focus:outline-none text-blackColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark placeholder:text-placeholder border border-transparent dark:border-borderColor2-dark placeholder:opacity-80 h-15 leading-15 font-medium rounded"
              value={reviewerWebsite}
              onChange={(e) => setReviewerWebsite(e.target.value)}
            />
          </div>

          <div>
            <input type="checkbox" />{" "}
            <span className="text-size-15 text-darkBlue dark:text-darkBlue-dark">
              Save my name, email, and website in this browser for the next time
              I comment.
            </span>
          </div>
          <div className="mt-30px">
            <button
              type="submit"
              disabled={createReviewMutation.isPending || !selectedRating}
              className="text-size-15 text-whiteColor bg-primaryColor px-25px py-10px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createReviewMutation.isPending ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewsContent;
