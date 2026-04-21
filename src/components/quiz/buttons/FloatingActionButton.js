/**
 * FloatingActionButton Component
 * 
 * Fixed position floating action button for mobile add/create actions
 */

'use client';

import React from 'react';

const FloatingActionButton = ({
  icon: Icon,
  onClick,
  label,
  position = 'bottom-right',
  disabled = false,
  className = '',
}) => {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        fixed z-50
        ${positionClasses[position]}
        w-14 h-14
        rounded-full
        bg-primaryColor text-whiteColor
        shadow-xl hover:shadow-2xl
        hover:bg-primaryColor/90
        active:scale-95
        transition-all duration-200
        flex items-center justify-center
        disabled:opacity-50 disabled:cursor-not-allowed
        md:hidden
        ${className}
      `}
      aria-label={label}
    >
      {Icon ? (
        <Icon className="w-6 h-6" />
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )}
    </button>
  );
};

export default FloatingActionButton;

