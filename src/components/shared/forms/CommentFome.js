'use client';

import React, { useState } from 'react';
import { useCreateCourseComment } from '@/hooks/api/useCourseComments';
import { useAuthStore } from '@/store';
import useSweetAlert from '@/hooks/useSweetAlert';

const CommentFome = ({ courseId, parentId = null }) => {
  const [formData, setFormData] = useState({
    commentText: ''
  });
  const [errors, setErrors] = useState({});

  const { isAuthenticated, user } = useAuthStore();
  const createComment = useCreateCourseComment();
  const createAlert = useSweetAlert();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.commentText || formData.commentText.trim().length === 0) {
      newErrors.commentText = 'Comment text is required';
    }

    if (formData.commentText && formData.commentText.trim().length > 5000) {
      newErrors.commentText = 'Comment text must be less than 5000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      createAlert({
        icon: 'error',
        title: 'Error',
        text: 'Please log in to post a comment'
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (!courseId) {
      createAlert({
        icon: 'error',
        title: 'Error',
        text: 'Course ID is required'
      });
      return;
    }

    try {
      await createComment.mutateAsync({
        courseId,
        commentText: formData.commentText,
        parentId: parentId || null
      });

      // Reset form
      setFormData({
        commentText: ''
      });
      setErrors({});
    } catch (error) {
      // Error handled by hook
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="pt-50px">
        <h4
          className="text-size-26 font-bold text-blackColor dark:text-blackColor-dark mb-30px !leading-30px"
          data-aos="fade-up"
        >
          Write your comment
        </h4>
        <div className="p-10 text-center bg-lightGrey12 dark:bg-darkdeep3-dark rounded-md">
          <p className="text-contentColor dark:text-contentColor-dark mb-5">
            Please <a href="/login" className="text-primaryColor hover:underline">log in</a> to post a comment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-50px">
      <h4
        className="text-size-26 font-bold text-blackColor dark:text-blackColor-dark mb-30px !leading-30px"
        data-aos="fade-up"
      >
        Write your comment
      </h4>
      <form className="pt-5" data-aos="fade-up" onSubmit={handleSubmit}>
        <div className="mb-10">
          <textarea
            name="commentText"
            value={formData.commentText}
            onChange={handleChange}
            placeholder="Enter your Message*"
            className={`w-full p-5 mb-2 bg-transparent text-sm text-contentColor dark:text-contentColor-dark border ${
              errors.commentText
                ? 'border-red-500 dark:border-red-500'
                : 'border-borderColor2 dark:border-borderColor2-dark'
            } rounded resize-none`}
            cols="30"
            rows="8"
            disabled={createComment.isPending}
          />
          {errors.commentText && (
            <p className="text-red-500 text-xs mb-2">{errors.commentText}</p>
          )}
          {formData.commentText && !errors.commentText && (
            <p className="text-xs text-contentColor dark:text-contentColor-dark">
              {formData.commentText.length}/5000 characters
            </p>
          )}
        </div>

        <div className="mt-30px text-center">
          <button
            type="submit"
            disabled={createComment.isPending}
            className="text-size-15 text-whiteColor bg-primaryColor px-70px py-13px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createComment.isPending ? 'Posting...' : parentId ? 'Post Reply' : 'Post a Comment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentFome;
