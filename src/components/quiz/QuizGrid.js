/**
 * QuizGrid Component
 * 
 * Responsive grid layout for quizzes with search, filters, sort, and pagination/infinite scroll
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiFilter, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useDebouncedValue } from '@/hooks/useDebouncedValue.js';
import QuizCard from './QuizCard.js';
import QuizSkeletonCard from './states/QuizSkeletonCard.js';
import QuizListEmptyState from './states/QuizListEmptyState.js';
import FilterSidebar from './filters/FilterSidebar.js';
import ManageQuizFilterSidebar from '@/components/manage/ManageQuizFilterSidebar.js';
import FilterChip from './filters/FilterChip.js';
import AdvancedDropdown from '@/components/shared/forms/AdvancedDropdown.js';

const QuizGrid = ({
  quizzes = [],
  isLoading = false,
  onSearch,
  onFilterChange,
  onSortChange,
  onPaginate,
  onLoadMore,
  paginationMode = 'pagination', // 'pagination' | 'infinite-scroll' | 'both'
  pagination = { page: 1, totalPages: 1, total: 0 },
  hasMore = false,
  role = 'instructor',
  searchValue = '',
  sortValue = 'newest',
  filters = {},
  actionHandlers = {},
  className = '',
}) => {
  const [localSearch, setLocalSearch] = useState(searchValue);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPaginationMode, setCurrentPaginationMode] = useState(
    paginationMode === 'both' ? 'pagination' : paginationMode
  );
  const debouncedSearch = useDebouncedValue(localSearch, 500);
  const observerTarget = useRef(null);

  // Handle debounced search
  useEffect(() => {
    if (onSearch && debouncedSearch !== searchValue) {
      onSearch(debouncedSearch);
    }
  }, [debouncedSearch, onSearch, searchValue]);

  // Infinite scroll observer
  useEffect(() => {
    if (currentPaginationMode !== 'infinite-scroll' && currentPaginationMode !== 'both') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && onLoadMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [currentPaginationMode, hasMore, isLoading, onLoadMore]);

  // Sort options
  const sortOptions = [
    { id: 'newest', label: 'Date: Newest First', value: 'newest' },
    { id: 'oldest', label: 'Date: Oldest First', value: 'oldest' },
    { id: 'title-asc', label: 'Title: A-Z', value: 'title-asc' },
    { id: 'title-desc', label: 'Title: Z-A', value: 'title-desc' },
    { id: 'status', label: 'Status', value: 'status' },
  ];

  // Get active filter chips
  const getActiveFilters = () => {
    const active = [];
    if (filters.courseId) {
      active.push({ key: 'courseId', label: `Course: ${filters.courseId}`, value: filters.courseId });
    }
    if (filters.orgId) {
      active.push({ key: 'orgId', label: `Org: ${filters.orgId}`, value: filters.orgId });
    }
    if (filters.status) {
      active.push({ key: 'status', label: `Status: ${filters.status}`, value: filters.status });
    }
    if (filters.quizType) {
      active.push({ key: 'quizType', label: `Type: ${filters.quizType}`, value: filters.quizType });
    }
    return active;
  };

  const activeFilters = getActiveFilters();

  const handleFilterRemove = (key) => {
    if (onFilterChange) {
      onFilterChange({ ...filters, [key]: null });
    }
  };

  const handlePageChange = (newPage) => {
    if (onPaginate) {
      onPaginate(newPage);
    }
  };

  const handleTogglePaginationMode = () => {
    if (paginationMode === 'both') {
      setCurrentPaginationMode(currentPaginationMode === 'pagination' ? 'infinite-scroll' : 'pagination');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title and Search */}
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-contentColor dark:text-contentColor-dark w-5 h-5" />
            <input
              type="text"
              placeholder="Search quizzes..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-borderColor dark:border-borderColor-dark rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className="px-4 py-2 border border-borderColor dark:border-borderColor-dark rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <FiFilter className="w-5 h-5" />
            <span>Filters</span>
            {activeFilters.length > 0 && (
              <span className="px-2 py-0.5 bg-primaryColor text-whiteColor rounded-full text-xs font-semibold">
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>

        {/* Sort and View Toggle */}
        <div className="flex items-center gap-3">
          {/* Sort Dropdown */}
          <div className="w-48">
            <AdvancedDropdown
              options={sortOptions}
              value={sortValue}
              onChange={(value) => onSortChange && onSortChange(value)}
              placeholder="Sort by..."
            />
          </div>

          {/* Pagination Mode Toggle (if both modes available) */}
          {paginationMode === 'both' && (
            <button
              onClick={handleTogglePaginationMode}
              className="px-3 py-2 text-sm border border-borderColor dark:border-borderColor-dark rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title={`Switch to ${currentPaginationMode === 'pagination' ? 'infinite scroll' : 'pagination'}`}
            >
              {currentPaginationMode === 'pagination' ? '∞' : '1 2 3'}
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <FilterChip
              key={filter.key}
              label={filter.label}
              value={filter.value}
              onRemove={() => handleFilterRemove(filter.key)}
            />
          ))}
        </div>
      )}

      {/* Quiz Grid */}
      {isLoading && quizzes.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, idx) => (
            <QuizSkeletonCard key={idx} />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <QuizListEmptyState
          message="No quizzes found"
          actionLabel={role !== 'student' ? 'Create Quiz' : undefined}
          onAction={role !== 'student' ? () => {} : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {quizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                role={role}
                context={role === 'student' ? 'student-view' : 'manage'}
                onEdit={actionHandlers.onEdit}
                onDelete={actionHandlers.onDelete}
                onView={actionHandlers.onView}
                onAttempt={actionHandlers.onAttempt}
                onPreview={actionHandlers.onPreview}
                onDuplicate={actionHandlers.onDuplicate}
                onViewAttempts={actionHandlers.onViewAttempts}
                onGenerateReport={actionHandlers.onGenerateReport}
                onViewReport={actionHandlers.onViewReport}
                onReminderSet={actionHandlers.onReminderSet}
              />
            ))}
          </div>

          {/* Infinite Scroll Trigger */}
          {(currentPaginationMode === 'infinite-scroll' || paginationMode === 'infinite-scroll') && (
            <div ref={observerTarget} className="h-10 flex items-center justify-center">
              {isLoading && hasMore && (
                <div className="text-contentColor dark:text-contentColor-dark">Loading more...</div>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {(currentPaginationMode === 'pagination' || paginationMode === 'pagination') &&
            pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-borderColor dark:border-borderColor-dark">
                <div className="text-sm text-contentColor dark:text-contentColor-dark">
                  Showing {(pagination.page - 1) * 20 + 1} to{' '}
                  {Math.min(pagination.page * 20, pagination.total)} of {pagination.total} quizzes
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="p-2 border border-borderColor dark:border-borderColor-dark rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <FiChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-2 text-sm text-contentColor dark:text-contentColor-dark">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-2 border border-borderColor dark:border-borderColor-dark rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <FiChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
        </>
      )}

      {/* Filter Sidebar - Use ManageQuizFilterSidebar for manage context, regular FilterSidebar for student view */}
      {role !== 'student' ? (
        <ManageQuizFilterSidebar
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          filters={filters}
          onFilterChange={onFilterChange}
          role={role}
        />
      ) : (
        <FilterSidebar
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          filters={filters}
          onFilterChange={onFilterChange}
          role={role}
        />
      )}
    </div>
  );
};

export default QuizGrid;

