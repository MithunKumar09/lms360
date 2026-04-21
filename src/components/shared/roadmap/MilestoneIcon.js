"use client";

import { useState } from "react";

/**
 * MilestoneIcon Component
 * 
 * Displays a milestone icon with:
 * - Stamp icon with 3D effect
 * - Color coding (gray=incomplete, gold=completed)
 * - Animation on completion
 * - Tooltip with milestone details
 */
const MilestoneIcon = ({ milestone, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const {
    number,
    type,
    title,
    completed,
    completedAt,
    stampAwarded,
    stampType,
  } = milestone;

  // Determine icon appearance
  const isCompleted = completed && stampAwarded;
  const iconColor = isCompleted ? 'text-yellow-500' : 'text-gray-400';
  const bgColor = isCompleted 
    ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' 
    : 'bg-gray-200 dark:bg-gray-700';
  
  // Get stamp icon based on type
  const getStampIcon = () => {
    if (!isCompleted) {
      return (
        <svg
          className="w-6 h-6"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      );
    }

    // Different icons for different stamp types
    switch (stampType) {
      case 'trophy_gold':
        return (
          <svg
            className="w-8 h-8"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      case 'trophy_blue':
        return (
          <svg
            className="w-8 h-8"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      case 'finishing':
      default:
        return (
          <svg
            className="w-8 h-8"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          milestone-icon
          relative
          w-12 h-12
          ${bgColor}
          rounded-full
          flex items-center justify-center
          transition-all duration-300
          ${isCompleted 
            ? 'transform hover:scale-110 shadow-lg hover:shadow-xl' 
            : 'opacity-60 cursor-not-allowed'
          }
          ${onClick && isCompleted ? 'cursor-pointer' : ''}
        `}
        style={{
          transform: isCompleted ? 'perspective(1000px) rotateY(0deg)' : 'none',
          filter: isCompleted ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' : 'none',
        }}
      >
        <div className={iconColor}>
          {getStampIcon()}
        </div>
        
        {/* Milestone Number Badge */}
        <div className={`
          absolute -top-1 -right-1
          w-5 h-5
          rounded-full
          flex items-center justify-center
          text-xs font-bold
          ${isCompleted 
            ? 'bg-yellow-600 text-white' 
            : 'bg-gray-500 text-white'
          }
        `}>
          {number}
        </div>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg whitespace-nowrap">
            <div className="font-semibold">{title || `Milestone ${number}`}</div>
            <div className="text-gray-300 mt-1">
              {isCompleted 
                ? `Completed ${completedAt ? new Date(completedAt).toLocaleDateString() : ''}`
                : 'Not completed yet'
              }
            </div>
            {isCompleted && stampType && (
              <div className="text-yellow-400 mt-1 capitalize">
                Stamp: {stampType.replace('_', ' ')}
              </div>
            )}
            {/* Tooltip Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MilestoneIcon;
