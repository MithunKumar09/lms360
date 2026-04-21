/**
 * CourseSearchSuggestions Component
 * 
 * Displays search suggestions including course results, recent searches,
 * and popular searches. Supports highlighting and keyboard navigation.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { highlightSearchTerm } from '@/lib/utils/searchUtils';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { usePopularSearches } from '@/hooks/api/usePopularSearches';

const CourseSearchSuggestions = ({
  searchTerm = '',
  suggestions = [],
  isVisible = false,
  onSelectSuggestion,
  onClose,
}) => {
  const { recentSearches, removeRecentSearch } = useRecentSearches();
  const { data: popularData } = usePopularSearches({ limit: 5 });
  const popularSearches = popularData?.popularSearches || [];

  // Filter recent searches to exclude current search term
  const filteredRecentSearches = recentSearches.filter(
    (term) => term.toLowerCase() !== searchTerm.toLowerCase()
  );

  // Show suggestions if visible and has content
  const hasSuggestions = suggestions.length > 0;
  const hasRecentSearches = filteredRecentSearches.length > 0;
  const hasPopularSearches = popularSearches.length > 0;
  const showSuggestions = isVisible && (hasSuggestions || hasRecentSearches || hasPopularSearches);

  if (!showSuggestions) return null;

  return (
    <div className="absolute left-0 top-full mt-2 w-full bg-whiteColor dark:bg-whiteColor-dark rounded-md shadow-dropdown-card dark:shadow-brand-dark border border-borderColor dark:border-borderColor-dark z-50 max-h-96 overflow-y-auto">
      {/* Course Suggestions */}
      {hasSuggestions && (
        <div className="p-4">
          <h5 className="text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
            Courses
          </h5>
          <ul className="space-y-1">
            {suggestions.map((course, idx) => (
              <li
                key={course.id || idx}
                className="flex items-center gap-3 p-2 hover:bg-lightGrey10 dark:hover:bg-lightGrey10-dark rounded cursor-pointer transition-colors"
                onClick={() => onSelectSuggestion?.(course)}
              >
                <Image
                  src={course.thumbnailUrl || '/images/placeholder.jpg'}
                  alt={course.title || 'Course'}
                  width={48}
                  height={48}
                  className="w-12 h-12 object-cover rounded flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/course-details-3?courseId=${course.id}`}
                    className="text-sm text-darkblack hover:text-primaryColor dark:text-darkblack-dark dark:hover:text-primaryColor block truncate"
                    onClick={onClose}
                  >
                    {highlightSearchTerm(course.title || '', searchTerm)}
                  </Link>
                  {!course.isFree && course.price && (
                    <p className="text-xs text-contentColor dark:text-contentColor-dark">
                      ${course.price.toFixed(2)}
                    </p>
                  )}
                  {course.isFree && (
                    <p className="text-xs text-greencolor">Free</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent Searches */}
      {hasRecentSearches && (
        <div className="p-4 border-t border-borderColor dark:border-borderColor-dark">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Recent Searches
            </h5>
          </div>
          <ul className="space-y-1">
            {filteredRecentSearches.slice(0, 5).map((term, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between p-2 hover:bg-lightGrey10 dark:hover:bg-lightGrey10-dark rounded cursor-pointer transition-colors group"
              >
                <button
                  onClick={() => onSelectSuggestion?.(term)}
                  className="flex-1 text-left text-sm text-contentColor hover:text-primaryColor dark:text-contentColor-dark dark:hover:text-primaryColor"
                >
                  <i className="icofont-clock-time mr-2"></i>
                  {highlightSearchTerm(term, searchTerm)}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecentSearch(term);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-contentColor hover:text-primaryColor dark:text-contentColor-dark dark:hover:text-primaryColor transition-opacity"
                  aria-label="Remove search"
                >
                  <i className="icofont-close text-xs"></i>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Popular Searches */}
      {hasPopularSearches && !searchTerm && (
        <div className="p-4 border-t border-borderColor dark:border-borderColor-dark">
          <h5 className="text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
            Popular Searches
          </h5>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((term, idx) => (
              <button
                key={idx}
                onClick={() => onSelectSuggestion?.(term)}
                className="px-3 py-1 text-xs bg-lightGrey10 dark:bg-lightGrey10-dark hover:bg-primaryColor hover:text-whiteColor dark:hover:text-whiteColor-dark text-contentColor dark:text-contentColor-dark rounded-full transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseSearchSuggestions;



