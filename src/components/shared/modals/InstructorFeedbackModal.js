'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCreateInstructorReview, useStudentReviewForInstructor } from '@/hooks/api/useInstructorReviews.js';
import { useAuthStore } from '@/store/index.js';

/**
 * Instructor Feedback Modal Component
 * 
 * Modal for students to submit feedback and ratings for instructors
 */
export default function InstructorFeedbackModal({ isOpen, onClose, instructorId }) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [errors, setErrors] = useState({});
  const modalRef = useRef(null);
  const contentRef = useRef(null);

  const user = useAuthStore((state) => state.user);
  const studentId = user?.id;

  const createReviewMutation = useCreateInstructorReview();
  const { data: existingReview, isLoading: isLoadingExistingReview, isError: isExistingReviewError } = useStudentReviewForInstructor(
    instructorId,
    studentId,
    { enabled: isOpen && !!studentId && !!instructorId }
  );

  // Load existing review if student has already reviewed
  useEffect(() => {
    if (existingReview && isOpen) {
      setSelectedRating(existingReview.rating || 0);
      setFeedbackText(existingReview.feedbackText || '');
    } else if (isOpen && !existingReview) {
      // Reset form if no existing review
      setSelectedRating(0);
      setFeedbackText('');
      setErrors({});
    }
  }, [existingReview, isOpen]);

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Handle click outside modal
  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};
    
    if (!selectedRating || selectedRating < 1 || selectedRating > 5) {
      newErrors.rating = 'Please select a rating';
    }

    if (feedbackText && feedbackText.length > 5000) {
      newErrors.feedbackText = 'Feedback text must be at most 5000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await createReviewMutation.mutateAsync({
        instructorId,
        rating: selectedRating,
        feedbackText: feedbackText.trim() || null
      });

      // Close modal after successful submission
      setTimeout(() => {
        onClose();
        // Reset form
        setSelectedRating(0);
        setFeedbackText('');
        setErrors({});
      }, 1000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Extract user-friendly error message
      let errorMessage = 'Failed to submit feedback. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      setErrors({ submit: errorMessage });
    }
  };

  if (!isOpen) {
    return null;
  }

  const isSubmitting = createReviewMutation.isPending;
  const hasExistingReview = !!existingReview;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-xxxl flex items-center justify-center p-15px transition-all duration-300"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="instructor-feedback-modal-title"
    >
      <div
        ref={contentRef}
        className="bg-whiteColor dark:bg-whiteColor-dark rounded-standard p-25px max-w-md w-full mx-auto max-h-[90vh] overflow-y-auto shadow-dropdown relative z-small transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-12px right-12px text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark opacity-50 hover:opacity-75 transition-opacity p-5px disabled:opacity-30"
          aria-label="Close feedback modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            className="w-5 h-5 fill-current"
          >
            <path d="M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z"></path>
          </svg>
        </button>

        {/* Modal Header */}
        <div className="mb-20px text-center">
          <h2
            id="instructor-feedback-modal-title"
            className="text-size-20 font-bold text-blackColor dark:text-blackColor-dark mb-5px"
          >
            {hasExistingReview ? 'Edit Your Feedback' : 'Give Feedback'}
          </h2>
          <p className="text-sm text-contentColor dark:text-contentColor-dark">
            {hasExistingReview 
              ? 'Update your rating and feedback for this instructor'
              : 'Share your experience with this instructor'
            }
          </p>
          {isLoadingExistingReview && (
            <p className="text-xs text-contentColor dark:text-contentColor-dark mt-5px opacity-70">
              Loading your previous feedback...
            </p>
          )}
          {isExistingReviewError && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-5px">
              Note: Unable to load your previous feedback. You can still submit a new review.
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="feedback-form">
          {/* Rating Selection */}
          <div className="mb-25px">
            <label className="block text-size-16 font-semibold text-blackColor dark:text-blackColor-dark mb-15px">
              Your Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-10px items-center">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => {
                    setSelectedRating(rating);
                    if (errors.rating) {
                      setErrors((prev) => ({ ...prev, rating: '' }));
                    }
                  }}
                  disabled={isSubmitting}
                  className={`
                    text-2xl focus:outline-none transition-all
                    ${selectedRating >= rating
                      ? 'text-yellow'
                      : 'text-gray-300 dark:text-gray-600'
                    }
                    ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
                  `}
                  aria-label={`Rate ${rating} star${rating > 1 ? 's' : ''}`}
                >
                  <i className="icofont-star"></i>
                </button>
              ))}
              {selectedRating > 0 && (
                <span className="ml-2 text-sm text-contentColor dark:text-contentColor-dark">
                  ({selectedRating} / 5)
                </span>
              )}
            </div>
            {errors.rating && (
              <p className="text-red-500 text-xs mt-5px">{errors.rating}</p>
            )}
          </div>

          {/* Feedback Text */}
          <div className="mb-25px">
            <label
              htmlFor="feedback-text"
              className="block text-size-16 font-semibold text-blackColor dark:text-blackColor-dark mb-10px"
            >
              Your Feedback (Optional)
            </label>
            <textarea
              id="feedback-text"
              placeholder="Share your thoughts about this instructor..."
              className="w-full p-15px bg-transparent text-sm text-blackColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded placeholder:text-placeholder focus:outline-none focus:border-primaryColor focus:ring-2 focus:ring-primaryColor/20 transition-all"
              cols="30"
              rows="6"
              value={feedbackText}
              onChange={(e) => {
                setFeedbackText(e.target.value);
                if (errors.feedbackText) {
                  setErrors((prev) => ({ ...prev, feedbackText: '' }));
                }
              }}
              disabled={isSubmitting}
              maxLength={5000}
            />
            <div className="flex justify-between items-center mt-5px">
              <span className="text-xs text-contentColor dark:text-contentColor-dark">
                {feedbackText.length} / 5000 characters
              </span>
            </div>
            {errors.feedbackText && (
              <p className="text-red-500 text-xs mt-5px">{errors.feedbackText}</p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="mb-20px p-10px bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Success Message */}
          {createReviewMutation.isSuccess && (
            <div className="mb-20px p-10px bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-600 dark:text-green-400 text-sm">
              {hasExistingReview ? 'Feedback updated successfully!' : 'Feedback submitted successfully!'}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-10px justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent px-25px py-10px border border-borderColor dark:border-borderColor-dark rounded hover:bg-lightGrey5 dark:hover:bg-darkdeep1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedRating}
              className="text-size-15 text-whiteColor bg-primaryColor px-25px py-10px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-whiteColor border-t-transparent mr-5px"></span>
                  Submitting...
                </>
              ) : (
                hasExistingReview ? 'Update Feedback' : 'Submit Feedback'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
