/**
 * AttemptProgressBadge Component
 * 
 * Badge component for displaying attempt progress (Attempt X of Y or Unlimited)
 * Progress indicator styling
 */

'use client';

import React from 'react';

const AttemptProgressBadge = ({ currentAttempt = 0, maxAttempts = 1, className = '' }) => {
  const isUnlimited = maxAttempts === null || maxAttempts === 0;
  const progress = isUnlimited ? null : (currentAttempt / maxAttempts) * 100;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-xs font-semibold text-contentColor dark:text-contentColor-dark">
        {isUnlimited ? (
          <span className="text-primaryColor dark:text-primaryColor">
            Attempt {currentAttempt} (Unlimited)
          </span>
        ) : (
          <span>
            Attempt <span className="text-primaryColor dark:text-primaryColor">{currentAttempt}</span> of{' '}
            <span className="text-contentColor dark:text-contentColor-dark">{maxAttempts}</span>
          </span>
        )}
      </span>
      {!isUnlimited && (
        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primaryColor dark:bg-primaryColor transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default AttemptProgressBadge;

