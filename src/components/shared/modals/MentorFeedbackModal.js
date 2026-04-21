"use client";

import { useState, useEffect, useRef } from "react";
import { useCreateMentorFeedback } from "@/hooks/api/useMentorFeedback";

/**
 * Mentor Feedback Modal Component
 * 
 * Modal for submitting feedback for a specific mentor.
 */
const MentorFeedbackModal = ({ isOpen, onClose, mentorId, mentorName }) => {
  const createFeedback = useCreateMentorFeedback();
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const [formData, setFormData] = useState({
    rating: null,
    message: "",
    category: "",
  });
  const [errors, setErrors] = useState({});

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        rating: null,
        message: "",
        category: "",
      });
      setErrors({});
    }
  }, [isOpen]);

  // Handle click outside modal
  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Handle rating selection
  const handleRatingChange = (rating) => {
    setFormData((prev) => ({
      ...prev,
      rating: prev.rating === rating ? null : rating,
    }));

    if (errors.rating) {
      setErrors((prev) => ({
        ...prev,
        rating: "",
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.rating) {
      newErrors.rating = 'Please select a rating';
    }

    if (!formData.message || formData.message.trim().length < 10) {
      newErrors.message = 'Feedback message must be at least 10 characters';
    } else if (formData.message.length > 1000) {
      newErrors.message = 'Feedback message must be at most 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!mentorId) {
      setErrors({ ...errors, general: 'Mentor ID is required' });
      return;
    }

    try {
      await createFeedback.mutateAsync({
        mentorId,
        data: {
          rating: formData.rating,
          category: formData.category || null,
          message: formData.message.trim(),
        },
      });

      // Reset form and close modal on success
      setFormData({
        rating: null,
        message: "",
        category: "",
      });
      setErrors({});
      
      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      // Error is handled by the hook
      console.error('Feedback submission error:', error);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-xxxl flex items-center justify-center p-15px transition-all duration-300"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(2px)",
      }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mentor-feedback-modal-title"
    >
      <div
        ref={contentRef}
        className="bg-whiteColor dark:bg-whiteColor-dark rounded-standard p-25px max-w-[500px] w-full max-h-[90vh] overflow-y-auto shadow-dropdown relative z-small transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-12px right-12px text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark opacity-50 hover:opacity-75 transition-opacity p-5px"
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
        <div className="mb-20px">
          <h2
            id="mentor-feedback-modal-title"
            className="text-size-24 font-bold text-blackColor dark:text-blackColor-dark mb-2"
          >
            Provide Feedback
          </h2>
          <p className="text-sm text-contentColor dark:text-contentColor-dark">
            Share your feedback for{" "}
            <span className="font-semibold text-blackColor dark:text-blackColor-dark">
              {mentorName || "this mentor"}
            </span>
          </p>
        </div>

        {/* Modal Content - Feedback Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* General Error Message */}
          {errors.general && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
            </div>
          )}
          {/* Rating Section */}
          <div>
            <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
              Overall Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleRatingChange(rating)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${
                    formData.rating === rating
                      ? "bg-primaryColor text-whiteColor scale-110"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                  aria-label={`Rate ${rating} out of 5`}
                >
                  <i className="icofont-star"></i>
                </button>
              ))}
            </div>
            {errors.rating && (
              <p className="text-xs text-red-500 mt-1">{errors.rating}</p>
            )}
          </div>

          {/* Category Section */}
          <div>
            <label
              htmlFor="feedback-category"
              className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2"
            >
              Category
            </label>
            <select
              id="feedback-category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor"
            >
              <option value="">Select a category (optional)</option>
              <option value="teaching">Teaching Quality</option>
              <option value="communication">Communication</option>
              <option value="support">Support & Guidance</option>
              <option value="availability">Availability</option>
              <option value="other">Other</option>
            </select>
            {errors.category && (
              <p className="text-xs text-red-500 mt-1">{errors.category}</p>
            )}
          </div>

          {/* Message Section */}
          <div>
            <label
              htmlFor="feedback-message"
              className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2"
            >
              Your Feedback <span className="text-red-500">*</span>
            </label>
            <textarea
              id="feedback-message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={6}
              placeholder="Please share your detailed feedback about this mentor..."
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor resize-none"
            />
            <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
              {formData.message.length}/1000 characters
            </p>
            {errors.message && (
              <p className="text-xs text-red-500 mt-1">{errors.message}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-borderColor dark:border-borderColor-dark">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createFeedback.isPending}
              className="px-6 py-2 text-sm font-medium text-whiteColor bg-primaryColor rounded-md hover:bg-opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-primaryColor focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createFeedback.isPending ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MentorFeedbackModal;
