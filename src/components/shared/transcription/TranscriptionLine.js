/**
 * Transcription Line Component
 * 
 * Individual transcript line with timestamp and highlighting support.
 */

'use client';

import React from 'react';

const TranscriptionLine = ({
  id,
  text,
  timestamp,
  isActive = false,
  isInterim = false,
  onClick,
  className = '',
}) => {
  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id={id}
      onClick={() => onClick && onClick(timestamp)}
      className={`
        px-4 py-3 mb-2
        border-l-4 rounded-r-md
        cursor-pointer
        transition-all duration-200
        ${
          isActive
            ? 'bg-primaryColor/20 dark:bg-primaryColor/30 border-primaryColor shadow-md'
            : 'bg-whiteColor dark:bg-whiteColor-dark border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
        }
        ${isInterim ? 'opacity-70 italic' : ''}
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        <span
          className={`
            text-xs font-mono font-semibold
            flex-shrink-0
            ${isActive ? 'text-primaryColor' : 'text-contentColor dark:text-contentColor-dark'}
          `}
        >
          {formatTimestamp(timestamp)}
        </span>
        <p
          className={`
            flex-1 text-sm leading-relaxed
            ${isActive
              ? 'text-headingColor dark:text-headingColor-dark font-medium'
              : 'text-contentColor dark:text-contentColor-dark'
            }
          `}
        >
          {text}
        </p>
        {isInterim && (
          <span className="text-xs text-contentColor dark:text-contentColor-dark opacity-50">
            (typing...)
          </span>
        )}
      </div>
    </div>
  );
};

export default TranscriptionLine;

