/**
 * Publish Button
 * 
 * Button to publish course with validation and loading state.
 */

'use client';

import { useState } from 'react';
import { useCourseStore } from '@/store/index.js';
import { useRouter } from 'next/navigation';

const PublishButton = ({ className = '' }) => {
  const { publish, publishing, validate, validationErrors, setValidationErrors, isEditMode } =
    useCourseStore();
  const [error, setError] = useState(null);
  const router = useRouter();

  const handlePublish = async () => {
    try {
      setError(null);

      // Validate before publishing (mark as attempted)
      const validation = validate(true); // true = mark validation as attempted
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        setError('Please fix validation errors before publishing');
        return;
      }

      // Publish course
      const result = await publish();

      if (result) {
        // Redirect to course details or show success message
        router.push(`/course-details-3?id=${result.id || ''}`);
      }
    } catch (err) {
      console.error('Error publishing course:', err);
      // Safely extract error message
      const errorMessage = err?.message || err?.toString() || 'Failed to publish course';
      setError(errorMessage);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handlePublish}
        disabled={publishing}
        className={`
          px-6 py-3 rounded-md font-semibold text-white
          bg-blue-600 hover:bg-blue-700
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          flex items-center justify-center gap-2
          ${className}
        `}
      >
        {publishing ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>{isEditMode ? 'Updating...' : 'Publishing...'}</span>
          </>
        ) : (
          <>
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{isEditMode ? 'Update Course' : 'Publish Course'}</span>
          </>
        )}
      </button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {typeof error === 'string' ? error : error?.message || String(error || 'An error occurred')}
        </p>
      )}
    </div>
  );
};

export default PublishButton;

