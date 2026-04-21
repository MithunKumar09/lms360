"use client";

import React, { useState } from 'react';
import { FiSearch, FiFilter, FiPlus } from 'react-icons/fi';
import Link from 'next/link';
import AdvancedDropdown from '@/components/shared/forms/AdvancedDropdown';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const ManageQuizHeader = ({
  title = 'Manage Quiz',
  onSearch,
  onSortChange,
  sortValue = 'newest',
  onFilterToggle,
  addQuizPath,
  role = 'instructor',
  className = '',
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const debouncedSearch = useDebouncedValue(localSearch, 500);

  // Handle debounced search
  React.useEffect(() => {
    if (onSearch) {
      onSearch(debouncedSearch);
    }
  }, [debouncedSearch, onSearch]);

  const sortOptions = [
    { id: 'newest', label: 'Newest First', value: 'newest' },
    { id: 'oldest', label: 'Oldest First', value: 'oldest' },
    { id: 'most-attempts', label: 'Most Attempts', value: 'most-attempts' },
    { id: 'title-asc', label: 'Title A→Z', value: 'title-asc' },
    { id: 'title-desc', label: 'Title Z→A', value: 'title-desc' },
  ];

  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-blackColor dark:text-blackColor-dark">
          {title}
        </h1>

        {/* Actions Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-contentColor dark:text-contentColor-dark w-5 h-5" />
            <input
              type="text"
              placeholder="Search quizzes..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-borderColor dark:border-borderColor-dark rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder-contentColor dark:placeholder-contentColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="w-full sm:w-48">
            <AdvancedDropdown
              options={sortOptions}
              value={sortValue}
              onChange={onSortChange}
              placeholder="Sort by..."
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={onFilterToggle}
            className="px-4 py-2 border border-borderColor dark:border-borderColor-dark rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            aria-label="Toggle filters"
          >
            <FiFilter className="w-5 h-5" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          {/* Add New Quiz Button */}
          {addQuizPath && (
            <Link
              href={addQuizPath}
              className="px-4 py-2 bg-primaryColor text-whiteColor rounded-lg font-semibold hover:bg-primaryColor/90 transition-colors flex items-center justify-center gap-2"
            >
              <FiPlus className="w-5 h-5" />
              <span>Add New Quiz</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageQuizHeader;

