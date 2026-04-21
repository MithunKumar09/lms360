/**
 * FilterChip Component
 * 
 * Removable filter chip with close icon
 * Used to display active filters
 */

'use client';

import React from 'react';
import { FiX } from 'react-icons/fi';

const FilterChip = ({ label, onRemove, value, className = '' }) => {
  return (
    <div
      className={`
        inline-flex items-center gap-2
        px-3 py-1.5
        bg-primaryColor/10 dark:bg-primaryColor/20
        text-primaryColor dark:text-primaryColor
        rounded-full
        text-sm font-medium
        ${className}
      `}
    >
      <span>{label}</span>
      {onRemove && (
        <button
          onClick={() => onRemove(value)}
          className="hover:bg-primaryColor/20 dark:hover:bg-primaryColor/30 rounded-full p-0.5 transition-colors"
          aria-label={`Remove ${label} filter`}
        >
          <FiX className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default FilterChip;

