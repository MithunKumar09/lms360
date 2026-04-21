/**
 * IconButton Component
 * 
 * Icon-only button with tooltip support and variants
 */

'use client';

import React, { useState } from 'react';

const IconButton = ({
  icon: Icon,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  ariaLabel,
  tooltip,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const variantClasses = {
    primary: 'bg-primaryColor/10 text-primaryColor hover:bg-primaryColor/20 dark:bg-primaryColor/20 dark:hover:bg-primaryColor/30',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
    danger: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30',
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel || tooltip}
        onMouseEnter={() => tooltip && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          inline-flex items-center justify-center
          rounded-lg
          transition-all duration-200
          active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
      >
        {Icon && <Icon className={iconSizes[size]} />}
      </button>
      {tooltip && showTooltip && (
        <div className="absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
};

export default IconButton;

