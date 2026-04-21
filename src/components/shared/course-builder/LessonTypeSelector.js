/**
 * Lesson Type Selector Component
 * 
 * Selector for lesson types: Video, Text, Quiz, Assignment, Material
 */

'use client';

import React from 'react';
import { LESSON_TYPES, LESSON_TYPE_LABELS } from '@/lib/course/constants';

const LessonTypeSelector = ({
  value,
  onChange,
  label = 'Lesson Type',
  className = '',
  error,
  disabled = false,
}) => {
  const lessonTypes = [
    { value: LESSON_TYPES.VIDEO, label: LESSON_TYPE_LABELS[LESSON_TYPES.VIDEO] },
    { value: LESSON_TYPES.TEXT, label: LESSON_TYPE_LABELS[LESSON_TYPES.TEXT] },
    { value: LESSON_TYPES.QUIZ, label: LESSON_TYPE_LABELS[LESSON_TYPES.QUIZ] },
    { value: LESSON_TYPES.ASSIGNMENT, label: LESSON_TYPE_LABELS[LESSON_TYPES.ASSIGNMENT] },
    { value: LESSON_TYPES.MATERIAL, label: LESSON_TYPE_LABELS[LESSON_TYPES.MATERIAL] },
  ];

  return (
    <div className={className}>
      {label && (
        <label className="block mb-2 text-sm font-semibold text-headingColor dark:text-headingColor-dark">
          {label}
        </label>
      )}
      <div className="bg-whiteColor relative rounded-md">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            text-base bg-transparent text-blackColor2 w-full p-13px pr-30px 
            focus:outline-none block appearance-none relative z-20 
            focus:shadow-select rounded-md
            ${error ? 'border-2 border-red-500' : 'border-2 border-borderColor dark:border-borderColor-dark'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <option value="">Select lesson type...</option>
          {lessonTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <i className="icofont-simple-down absolute top-1/2 right-3 -translate-y-1/2 block text-lg z-10 pointer-events-none"></i>
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {typeof error === 'string' ? error : error?.message || String(error || 'An error occurred')}
        </p>
      )}
    </div>
  );
};

export default LessonTypeSelector;

