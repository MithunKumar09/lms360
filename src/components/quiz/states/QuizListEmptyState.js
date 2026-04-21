/**
 * QuizListEmptyState Component
 * 
 * Empty state component with illustration/icon and optional action button
 */

'use client';

import React from 'react';
import { FiInbox } from 'react-icons/fi';

const QuizListEmptyState = ({
  message = 'No quizzes available',
  icon: Icon = FiInbox,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="mb-4 text-gray-400 dark:text-gray-600">
        {Icon && <Icon className="w-16 h-16 mx-auto" />}
      </div>
      <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-2">
        {message}
      </h3>
      <p className="text-sm text-contentColor dark:text-contentColor-dark mb-6 max-w-md">
        {actionLabel
          ? 'Get started by creating your first quiz or adjusting your filters.'
          : 'Try adjusting your search or filter criteria to find what you\'re looking for.'}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2 bg-primaryColor text-whiteColor rounded-lg font-semibold hover:bg-primaryColor/90 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default QuizListEmptyState;

