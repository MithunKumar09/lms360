/**
 * Assign Modal Component
 * 
 * Modal for assigning a course to selected options.
 * Shows available cohorts, classes, subjects, years, semesters.
 * Main assignments are read-only.
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/index.js';
import useAssignCourseStore from '@/store/assignCourseStore.js';
import { useAssignmentOptions } from '@/hooks/api/useAssignmentOptions.js';
import { useAssignCourse } from '@/hooks/api/useAssignCourse.js';
import { validateAssignCourse } from '@/lib/validation/schemas/assignCourseSchema.js';
import ValidationError from '@/components/shared/errors/ValidationError.js';
import ErrorDisplay from '@/components/shared/errors/ErrorDisplay.js';

const AssignModal = () => {
  const user = useAuthStore((state) => state.user);
  const selectedCourse = useAssignCourseStore((state) => state.selectedCourse);
  const isOpen = useAssignCourseStore((state) => state.isAssignModalOpen);
  const closeModal = useAssignCourseStore((state) => state.closeAssignModal);

  // Fetch assignment options
  const {
    data: optionsData,
    isLoading: isLoadingOptions,
    isError: isOptionsError,
    error: optionsError,
  } = useAssignmentOptions(selectedCourse, {
    enabled: isOpen && !!selectedCourse,
  });

  const options = optionsData?.options || {};
  const mainAssignments = optionsData?.mainAssignments || {};
  const existingAssignments = optionsData?.existingAssignments || {};

  // Assignment mutation
  const assignMutation = useAssignCourse();

  // Selected assignments state
  const [selectedAssignments, setSelectedAssignments] = useState({
    cohortIds: [],
    programNodeIds: [],
    classIds: [],
    subjectIds: [],
    years: [],
    semesters: [],
  });

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({});

  // Reset selections when modal opens/closes or course changes
  useEffect(() => {
    if (isOpen && selectedCourse) {
      setSelectedAssignments({
        cohortIds: [],
        programNodeIds: [],
        classIds: [],
        subjectIds: [],
        years: [],
        semesters: [],
      });
      setValidationErrors({});
    }
  }, [isOpen, selectedCourse]);

  // Clear validation errors when selections change
  useEffect(() => {
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors({});
    }
  }, [selectedAssignments]);

  const handleToggleSelection = (type, id) => {
    setSelectedAssignments((prev) => {
      const key = `${type}Ids`;
      const currentIds = prev[key] || [];
      const isSelected = currentIds.includes(id);

      return {
        ...prev,
        [key]: isSelected
          ? currentIds.filter((itemId) => itemId !== id)
          : [...currentIds, id],
      };
    });
  };

  const handleToggleYear = (year) => {
    setSelectedAssignments((prev) => {
      const currentYears = prev.years || [];
      const isSelected = currentYears.includes(year);

      return {
        ...prev,
        years: isSelected
          ? currentYears.filter((y) => y !== year)
          : [...currentYears, year],
      };
    });
  };

  const handleToggleSemester = (semester) => {
    setSelectedAssignments((prev) => {
      const currentSemesters = prev.semesters || [];
      const isSelected = currentSemesters.includes(semester);

      return {
        ...prev,
        semesters: isSelected
          ? currentSemesters.filter((s) => s !== semester)
          : [...currentSemesters, semester],
      };
    });
  };

  const handleSelectAll = (type, items) => {
    const availableItems = items.filter(
      (item) => !mainAssignments[`${type}s`]?.includes(item.id)
    );

    setSelectedAssignments((prev) => {
      const key = `${type}Ids`;
      const currentIds = prev[key] || [];
      const allSelected = availableItems.every((item) =>
        currentIds.includes(item.id)
      );

      return {
        ...prev,
        [key]: allSelected
          ? currentIds.filter((id) => !availableItems.some((item) => item.id === id))
          : [
              ...new Set([
                ...currentIds,
                ...availableItems.map((item) => item.id),
              ]),
            ],
      };
    });
  };

  const handleSubmit = async () => {
    if (!selectedCourse) return;

    // Validate form data
    const validation = validateAssignCourse({
      assignments: selectedAssignments,
    });

    if (!validation.success) {
      setValidationErrors(validation.errors);
      return;
    }

    // Clear validation errors
    setValidationErrors({});

    // Submit assignment
    assignMutation.mutate(
      {
        courseId: selectedCourse,
        assignments: selectedAssignments,
      },
      {
        onSuccess: () => {
          // Close modal on success
          handleClose();
        },
        onError: (error) => {
          // Error is handled by the mutation hook (toast notification)
          console.error('Assignment error:', error);
        },
      }
    );
  };

  const handleClose = () => {
    closeModal();
    setSelectedAssignments({
      cohortIds: [],
      programNodeIds: [],
      classIds: [],
      subjectIds: [],
      years: [],
      semesters: [],
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 transition-opacity"
      style={{
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' : 'hidden',
      }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={handleClose}
        aria-label="Close modal"
      />

      {/* Modal Content */}
      <div
        className="relative z-10 w-full max-w-4xl max-h-[90vh] mx-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-xl overflow-hidden flex flex-col animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-borderColor dark:border-borderColor-dark flex justify-between items-center">
          <h2 id="assign-modal-title" className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
            Assign Course
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingOptions ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primaryColor"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Loading assignment options...
              </p>
            </div>
          ) : isOptionsError ? (
            <div className="text-center py-12">
              <ErrorDisplay
                error={optionsError}
                type="inline"
                variant="error"
                dismissible={false}
              />
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-primaryColor text-whiteColor rounded hover:bg-primaryColor/90 transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Years */}
              {options.years && options.years.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                      Years
                    </h3>
                    <button
                      onClick={() => handleSelectAll('year', options.years)}
                      className="text-sm text-primaryColor hover:underline"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {options.years.map((year) => {
                      const isMain = mainAssignments.years?.includes(year);
                      const isAssigned = existingAssignments.years?.includes(year);
                      const isReadOnly = isMain || isAssigned;
                      const isSelected = selectedAssignments.years?.includes(year);

                      return (
                        <label
                          key={year}
                          className={`px-4 py-2 border rounded cursor-pointer transition-all duration-200 ${
                            isReadOnly
                              ? 'bg-gray-200 dark:bg-gray-700 border-gray-400 cursor-not-allowed opacity-60'
                              : isSelected
                              ? 'bg-primaryColor text-whiteColor border-primaryColor transform scale-105'
                              : 'border-borderColor dark:border-borderColor-dark hover:border-primaryColor hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                          aria-label={`Year ${year}${isMain ? ' (Main assignment)' : isAssigned ? ' (Already assigned)' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isReadOnly || isSelected}
                            disabled={isReadOnly}
                            onChange={() => !isReadOnly && handleToggleYear(year)}
                            className="sr-only"
                            aria-label={`Select year ${year}`}
                          />
                          Year {year}
                          {isMain && (
                            <span className="ml-2 text-xs">(Main)</span>
                          )}
                          {!isMain && isAssigned && (
                            <span className="ml-2 text-xs">(Assigned)</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Semesters */}
              {options.semesters && options.semesters.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                      Semesters
                    </h3>
                    <button
                      onClick={() => handleSelectAll('semester', options.semesters)}
                      className="text-sm text-primaryColor hover:underline"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {options.semesters.map((semester) => {
                      const isMain = mainAssignments.semesters?.includes(semester);
                      const isAssigned = existingAssignments.semesters?.includes(semester);
                      const isReadOnly = isMain || isAssigned;
                      const isSelected =
                        selectedAssignments.semesters?.includes(semester);

                      return (
                        <label
                          key={semester}
                          className={`px-4 py-2 border rounded cursor-pointer transition-colors ${
                            isReadOnly
                              ? 'bg-gray-200 dark:bg-gray-700 border-gray-400 cursor-not-allowed opacity-60'
                              : isSelected
                              ? 'bg-primaryColor text-whiteColor border-primaryColor'
                              : 'border-borderColor dark:border-borderColor-dark hover:border-primaryColor'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isReadOnly || isSelected}
                            disabled={isReadOnly}
                            onChange={() => !isReadOnly && handleToggleSemester(semester)}
                            className="sr-only"
                          />
                          Semester {semester}
                          {isMain && <span className="ml-2 text-xs">(Main)</span>}
                          {!isMain && isAssigned && <span className="ml-2 text-xs">(Assigned)</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cohorts (merged with program nodes) */}
              {options.cohorts && options.cohorts.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                      Cohorts & Program Nodes
                    </h3>
                    <button
                      onClick={() => handleSelectAll('cohort', options.cohorts)}
                      className="text-sm text-primaryColor hover:underline"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {options.cohorts.map((cohort) => {
                      const isMain = cohort.isMain || mainAssignments.cohorts?.includes(cohort.id);
                      const isAssigned = cohort.isAssigned || existingAssignments.cohorts?.includes(cohort.id);
                      const isReadOnly = isMain || isAssigned;
                      const isSelected =
                        selectedAssignments.cohortIds?.includes(cohort.id);

                      return (
                        <label
                          key={cohort.id}
                          className={`flex items-center p-3 border rounded cursor-pointer transition-colors ${
                            isReadOnly
                              ? 'bg-gray-200 dark:bg-gray-700 border-gray-400 cursor-not-allowed opacity-60'
                              : isSelected
                              ? 'bg-primaryColor/10 border-primaryColor'
                              : 'border-borderColor dark:border-borderColor-dark hover:border-primaryColor'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isReadOnly || isSelected}
                            disabled={isReadOnly}
                            onChange={() =>
                              !isReadOnly && handleToggleSelection('cohort', cohort.id)
                            }
                            className="mr-3"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-blackColor dark:text-blackColor-dark">
                              {cohort.name}
                            </div>
                            {cohort.programNode && (
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {cohort.programNode.name}
                              </div>
                            )}
                            {cohort.year && (
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                Year {cohort.year}
                                {cohort.semester && `, Semester ${cohort.semester}`}
                              </div>
                            )}
                          </div>
                          {isMain && (
                            <span className="ml-2 text-xs text-gray-500">(Main)</span>
                          )}
                          {!isMain && isAssigned && (
                            <span className="ml-2 text-xs text-gray-500">(Assigned)</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Classes */}
              {options.classes && options.classes.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                      Classes
                    </h3>
                    <button
                      onClick={() => handleSelectAll('class', options.classes)}
                      className="text-sm text-primaryColor hover:underline"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {options.classes.map((cls) => {
                      const isMain = cls.isMain || mainAssignments.classes?.includes(cls.id);
                      const isAssigned = cls.isAssigned || existingAssignments.cohorts?.includes(cls.id); // classes map to cohorts
                      const isReadOnly = isMain || isAssigned;
                      const isSelected =
                        selectedAssignments.classIds?.includes(cls.id);

                      return (
                        <label
                          key={cls.id}
                          className={`flex items-center p-3 border rounded cursor-pointer transition-colors ${
                            isReadOnly
                              ? 'bg-gray-200 dark:bg-gray-700 border-gray-400 cursor-not-allowed opacity-60'
                              : isSelected
                              ? 'bg-primaryColor/10 border-primaryColor'
                              : 'border-borderColor dark:border-borderColor-dark hover:border-primaryColor'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isReadOnly || isSelected}
                            disabled={isReadOnly}
                            onChange={() =>
                              !isReadOnly && handleToggleSelection('class', cls.id)
                            }
                            className="mr-3"
                          />
                          <div className="font-medium text-blackColor dark:text-blackColor-dark">
                            {cls.name}
                          </div>
                          {isMain && (
                            <span className="ml-auto text-xs text-gray-500">(Main)</span>
                          )}
                          {!isMain && isAssigned && (
                            <span className="ml-auto text-xs text-gray-500">(Assigned)</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Subjects */}
              {options.subjects && options.subjects.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
                      Subjects
                    </h3>
                    <button
                      onClick={() => handleSelectAll('subject', options.subjects)}
                      className="text-sm text-primaryColor hover:underline"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {options.subjects.map((subject) => {
                      const isMain = subject.isMain || mainAssignments.subjects?.includes(subject.id);
                      const isAssigned = subject.isAssigned || existingAssignments.subjects?.includes(subject.id);
                      const isReadOnly = isMain || isAssigned;
                      const isSelected =
                        selectedAssignments.subjectIds?.includes(subject.id);

                      return (
                        <label
                          key={subject.id}
                          className={`flex items-center p-3 border rounded cursor-pointer transition-colors ${
                            isReadOnly
                              ? 'bg-gray-200 dark:bg-gray-700 border-gray-400 cursor-not-allowed opacity-60'
                              : isSelected
                              ? 'bg-primaryColor/10 border-primaryColor'
                              : 'border-borderColor dark:border-borderColor-dark hover:border-primaryColor'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isReadOnly || isSelected}
                            disabled={isReadOnly}
                            onChange={() =>
                              !isReadOnly && handleToggleSelection('subject', subject.id)
                            }
                            className="mr-3"
                          />
                          <div className="font-medium text-blackColor dark:text-blackColor-dark">
                            {subject.name}
                          </div>
                          {isMain && (
                            <span className="ml-auto text-xs text-gray-500">(Main)</span>
                          )}
                          {!isMain && isAssigned && (
                            <span className="ml-auto text-xs text-gray-500">(Assigned)</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {!options.years?.length &&
                !options.semesters?.length &&
                !options.cohorts?.length &&
                !options.classes?.length &&
                !options.subjects?.length && (
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">
                      No assignment options available.
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-borderColor dark:border-borderColor-dark">
          {/* Validation Errors */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="mb-4">
              <ErrorDisplay
                error={validationErrors.assignments || validationErrors._form || 'Please fix the errors above'}
                type="inline"
                variant="error"
                dismissible={true}
                onDismiss={() => setValidationErrors({})}
              />
            </div>
          )}

          {/* Mutation Error */}
          {assignMutation.isError && (
            <div className="mb-4">
              <ErrorDisplay
                error={assignMutation.error}
                type="inline"
                variant="error"
                dismissible={true}
                onDismiss={() => assignMutation.reset()}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              disabled={assignMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={assignMutation.isPending}
              className="px-6 py-2 bg-primaryColor text-whiteColor rounded hover:bg-primaryColor/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primaryColor focus:ring-offset-2"
              aria-label="Submit assignment"
            >
              {assignMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-whiteColor"></span>
                  Assigning...
                </span>
              ) : (
                'Assign Course'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignModal;

