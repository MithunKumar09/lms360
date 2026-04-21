/**
 * QuizStatusBadge Component
 * 
 * Modern badge component for displaying quiz status (draft, published, upcoming, closed)
 * Figma-style with soft colors and rounded corners
 */

'use client';

import React from 'react';

const QuizStatusBadge = ({ status = 'draft', className = '' }) => {
  const statusConfig = {
    draft: {
      label: 'Draft',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      textColor: 'text-gray-700 dark:text-gray-300',
      borderColor: 'border-gray-300 dark:border-gray-600',
    },
    published: {
      label: 'Published',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      textColor: 'text-green-700 dark:text-green-400',
      borderColor: 'border-green-300 dark:border-green-700',
    },
    upcoming: {
      label: 'Upcoming',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      textColor: 'text-blue-700 dark:text-blue-400',
      borderColor: 'border-blue-300 dark:border-blue-700',
    },
    closed: {
      label: 'Closed',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      textColor: 'text-red-700 dark:text-red-400',
      borderColor: 'border-red-300 dark:border-red-700',
    },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default QuizStatusBadge;

