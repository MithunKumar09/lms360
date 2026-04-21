/**
 * QuizTypeBadge Component
 * 
 * Badge component for displaying quiz type (main_course, mini_course, global)
 * Color-coded variants
 */

'use client';

import React from 'react';

const QuizTypeBadge = ({ quizType = 'main_course', className = '' }) => {
  const typeConfig = {
    main_course: {
      label: 'Main Course',
      bgColor: 'bg-primaryColor/10 dark:bg-primaryColor/20',
      textColor: 'text-primaryColor dark:text-primaryColor',
      borderColor: 'border-primaryColor/30 dark:border-primaryColor/50',
    },
    mini_course: {
      label: 'Mini Course',
      bgColor: 'bg-secondaryColor/10 dark:bg-secondaryColor/20',
      textColor: 'text-secondaryColor dark:text-secondaryColor',
      borderColor: 'border-secondaryColor/30 dark:border-secondaryColor/50',
    },
    global: {
      label: 'Global',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      textColor: 'text-blue-700 dark:text-blue-400',
      borderColor: 'border-blue-300 dark:border-blue-700',
    },
  };

  const config = typeConfig[quizType] || typeConfig.main_course;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default QuizTypeBadge;

