"use client";

import React, { useState, useEffect } from 'react';
import { FiX, FiCopy } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import useCoursesForDropdown from '@/hooks/api/useCoursesForDropdown.js';
import useSweetAlert from '@/hooks/useSweetAlert';
import AdvancedDropdown from '@/components/shared/forms/AdvancedDropdown';

/**
 * QuizDuplicateModal Component
 * 
 * Modal for duplicating a quiz with options to change title, course, org, and quiz type
 */
const QuizDuplicateModal = ({
  isOpen,
  onClose,
  quizId,
  role = 'instructor',
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const [formData, setFormData] = useState({
    newTitle: '',
    targetCourseId: null,
    targetOrgId: null,
    targetQuizType: null,
  });
  const [errors, setErrors] = useState({});

  // Fetch original quiz data
  const { data: quizData, isLoading: isLoadingQuiz } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      const response = await apiClient.get(`/quizzes/${quizId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch quiz');
      }
      return response.quiz;
    },
    enabled: isOpen && !!quizId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch courses for dropdown (if main_course)
  const { data: coursesData } = useCoursesForDropdown();
  const courses = coursesData?.courses || [];

  // Fetch organizations for superadmin
  const { data: orgsData } = useQuery({
    queryKey: ['organizations', 'list'],
    queryFn: async () => {
      const response = await apiClient.get('/organizations');
      return response.organizations || [];
    },
    enabled: role === 'superadmin' && isOpen,
    staleTime: 5 * 60 * 1000,
  });
  const organizations = orgsData || [];

  // Initialize form when quiz data loads
  useEffect(() => {
    if (quizData && isOpen) {
      setFormData({
        newTitle: `Copy of ${quizData.title}`,
        targetCourseId: quizData.courseId,
        targetOrgId: quizData.orgId,
        targetQuizType: quizData.quizType || 'main_course',
      });
      setErrors({});
    }
  }, [quizData, isOpen]);

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post(`/quizzes/${quizId}/duplicate`, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to duplicate quiz');
      }
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      createAlert({
        icon: 'success',
        title: 'Success!',
        text: 'Quiz duplicated successfully',
      });
      if (onSuccess) {
        onSuccess(data.quizId);
      }
      onClose();
    },
    onError: (error) => {
      createAlert({
        icon: 'error',
        title: 'Error!',
        text: error.message || 'Failed to duplicate quiz',
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    const newErrors = {};
    if (!formData.newTitle || formData.newTitle.trim().length < 3) {
      newErrors.newTitle = 'Title must be at least 3 characters';
    }
    if (formData.targetQuizType === 'main_course' && !formData.targetCourseId) {
      newErrors.targetCourseId = 'Course is required for main course quizzes';
    }
    if (role === 'superadmin' && !formData.targetOrgId && formData.targetQuizType !== 'global') {
      newErrors.targetOrgId = 'Organization is required (except for global quizzes)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Prepare payload
    const payload = {
      newTitle: formData.newTitle.trim(),
    };

    // Only include fields that are different from original or required
    if (formData.targetCourseId !== quizData?.courseId) {
      payload.targetCourseId = formData.targetCourseId;
    }
    if (role === 'superadmin' && formData.targetOrgId !== quizData?.orgId) {
      payload.targetOrgId = formData.targetOrgId;
    }
    if (role === 'superadmin' && formData.targetQuizType !== quizData?.quizType) {
      payload.targetQuizType = formData.targetQuizType;
    }

    duplicateMutation.mutate(payload);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  if (!isOpen) return null;

  const courseOptions = [
    { id: 'none', label: 'No Course', value: null },
    ...courses.map((course) => ({
      id: course.id,
      label: course.title,
      value: course.id,
    })),
  ];

  const orgOptions = [
    { id: 'none', label: 'No Organization (Global)', value: null },
    ...organizations.map((org) => ({
      id: org.id,
      label: org.name,
      value: org.id,
    })),
  ];

  const quizTypeOptions = [
    { id: 'main_course', label: 'Main Course', value: 'main_course' },
    { id: 'mini_course', label: 'Mini Course', value: 'mini_course' },
    { id: 'global', label: 'Global', value: 'global' },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-whiteColor dark:bg-whiteColor-dark border-b border-borderColor dark:border-borderColor-dark p-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <FiCopy className="w-6 h-6 text-primaryColor" />
              <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
                Duplicate Quiz
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <FiX className="w-5 h-5 text-contentColor dark:text-contentColor-dark" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {isLoadingQuiz ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primaryColor"></div>
              </div>
            ) : (
              <>
                {/* Original Quiz Info */}
                {quizData && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">
                      Original Quiz:
                    </p>
                    <p className="font-semibold text-blackColor dark:text-blackColor-dark">
                      {quizData.title}
                    </p>
                  </div>
                )}

                {/* New Title */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                    New Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.newTitle}
                    onChange={(e) => handleChange('newTitle', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark ${
                      errors.newTitle
                        ? 'border-red-500'
                        : 'border-borderColor dark:border-borderColor-dark'
                    }`}
                    placeholder="Enter new quiz title"
                    required
                  />
                  {errors.newTitle && (
                    <p className="mt-1 text-sm text-red-500">{errors.newTitle}</p>
                  )}
                </div>

                {/* Quiz Type (Superadmin only) */}
                {role === 'superadmin' && (
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                      Quiz Type
                    </label>
                    <AdvancedDropdown
                      options={quizTypeOptions}
                      value={formData.targetQuizType || 'main_course'}
                      onChange={(value) => handleChange('targetQuizType', value)}
                      placeholder="Select quiz type"
                    />
                  </div>
                )}

                {/* Organization (Superadmin only) */}
                {role === 'superadmin' && (
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                      Organization
                    </label>
                    <AdvancedDropdown
                      options={orgOptions}
                      value={formData.targetOrgId || 'none'}
                      onChange={(value) => handleChange('targetOrgId', value === 'none' ? null : value)}
                      placeholder="Select organization"
                      searchable={true}
                    />
                    {errors.targetOrgId && (
                      <p className="mt-1 text-sm text-red-500">{errors.targetOrgId}</p>
                    )}
                  </div>
                )}

                {/* Target Course (if main_course quiz type) */}
                {(formData.targetQuizType === 'main_course' || (!role === 'superadmin' && quizData?.quizType === 'main_course')) && (
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                      Target Course
                    </label>
                    <AdvancedDropdown
                      options={courseOptions}
                      value={formData.targetCourseId || 'none'}
                      onChange={(value) => handleChange('targetCourseId', value === 'none' ? null : value)}
                      placeholder="Select course"
                      searchable={true}
                    />
                    {errors.targetCourseId && (
                      <p className="mt-1 text-sm text-red-500">{errors.targetCourseId}</p>
                    )}
                  </div>
                )}

                {/* Info Message */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    The duplicated quiz will be created as a draft with all questions and options copied. 
                    Start and end dates will be reset.
                  </p>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-borderColor dark:border-borderColor-dark">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-borderColor dark:border-borderColor-dark rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={duplicateMutation.isPending || isLoadingQuiz}
                className="px-4 py-2 bg-primaryColor text-whiteColor rounded-lg font-semibold hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {duplicateMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-whiteColor"></div>
                    Duplicating...
                  </>
                ) : (
                  <>
                    <FiCopy className="w-4 h-4" />
                    Duplicate Quiz
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default QuizDuplicateModal;

