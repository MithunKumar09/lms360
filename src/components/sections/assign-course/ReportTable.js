/**
 * Report Table Component
 * 
 * Advanced table component for displaying assignment report data.
 * Features: sorting, filtering, pagination, and export options.
 */

'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import NoData from '@/components/shared/others/NoData.js';

const ReportTable = ({ data, onExport }) => {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc',
  });
  const [filters, setFilters] = useState({
    courseTitle: '',
    instructorName: '',
    assignedTo: '',
    assignmentType: '',
    status: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let result = [...(data || [])];

    // Apply filters
    if (filters.courseTitle) {
      result = result.filter((item) =>
        item.course?.title?.toLowerCase().includes(filters.courseTitle.toLowerCase())
      );
    }
    if (filters.instructorName) {
      result = result.filter((item) =>
        item.instructor?.name?.toLowerCase().includes(filters.instructorName.toLowerCase())
      );
    }
    if (filters.assignedTo) {
      result = result.filter((item) =>
        item.assignedTo?.name?.toLowerCase().includes(filters.assignedTo.toLowerCase())
      );
    }
    if (filters.assignmentType) {
      result = result.filter((item) => item.assignmentType === filters.assignmentType);
    }
    if (filters.status) {
      result = result.filter((item) => item.status === filters.status);
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle nested objects
        if (sortConfig.key === 'course') {
          aValue = a.course?.title || '';
          bValue = b.course?.title || '';
        } else if (sortConfig.key === 'instructor') {
          aValue = a.instructor?.name || '';
          bValue = b.instructor?.name || '';
        } else if (sortConfig.key === 'assignedTo') {
          aValue = a.assignedTo?.name || '';
          bValue = b.assignedTo?.name || '';
        } else if (sortConfig.key === 'assignedDate') {
          aValue = new Date(a.assignedDate || 0).getTime();
          bValue = new Date(b.assignedDate || 0).getTime();
        } else if (sortConfig.key === 'assignedBy') {
          aValue = a.assignedBy?.name || '';
          bValue = b.assignedBy?.name || '';
        }

        // Compare values
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [data, filters, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedData, currentPage]);

  // Memoize handlers to prevent unnecessary re-renders
  const handleSort = useCallback(
    (key) => {
      setSortConfig((prev) => ({
        key,
        direction:
          prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
      }));
    },
    []
  );

  // Handle filter change
  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page on filter change
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      courseTitle: '',
      instructorName: '',
      assignedTo: '',
      assignmentType: '',
      status: '',
    });
    setCurrentPage(1);
  }, []);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-primaryColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-primaryColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-1">
              Course Title
            </label>
            <input
              type="text"
              value={filters.courseTitle}
              onChange={(e) => handleFilterChange('courseTitle', e.target.value)}
              placeholder="Filter by course..."
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-1">
              Instructor
            </label>
            <input
              type="text"
              value={filters.instructorName}
              onChange={(e) => handleFilterChange('instructorName', e.target.value)}
              placeholder="Filter by instructor..."
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-1">
              Assigned To
            </label>
            <input
              type="text"
              value={filters.assignedTo}
              onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
              placeholder="Filter by assigned to..."
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-1">
              Type
            </label>
            <select
              value={filters.assignmentType}
              onChange={(e) => handleFilterChange('assignmentType', e.target.value)}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-sm"
            >
              <option value="">All Types</option>
              <option value="main">Main</option>
              <option value="assigned">Assigned</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        {(filters.courseTitle ||
          filters.instructorName ||
          filters.assignedTo ||
          filters.assignmentType ||
          filters.status) && (
          <div className="mt-3">
            <button
              onClick={clearFilters}
              className="text-sm text-primaryColor hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-sm">
        <table className="w-full text-left" role="table" aria-label="Assignment report table">
          <thead className="bg-lightGrey5 dark:bg-gray-800">
            <tr>
              <th
                className="px-5 py-3 text-sm font-semibold text-blackColor dark:text-blackColor-dark cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                onClick={() => handleSort('course')}
                role="columnheader"
                aria-sort={sortConfig.key === 'course' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSort('course');
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  Course Title
                  {getSortIcon('course')}
                </div>
              </th>
              <th
                className="px-5 py-3 text-sm font-semibold text-blackColor dark:text-blackColor-dark cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('instructor')}
              >
                <div className="flex items-center gap-2">
                  Instructor
                  {getSortIcon('instructor')}
                </div>
              </th>
              <th
                className="px-5 py-3 text-sm font-semibold text-blackColor dark:text-blackColor-dark cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('assignedTo')}
              >
                <div className="flex items-center gap-2">
                  Assigned To
                  {getSortIcon('assignedTo')}
                </div>
              </th>
              <th
                className="px-5 py-3 text-sm font-semibold text-blackColor dark:text-blackColor-dark cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('assignmentType')}
              >
                <div className="flex items-center gap-2">
                  Type
                  {getSortIcon('assignmentType')}
                </div>
              </th>
              <th
                className="px-5 py-3 text-sm font-semibold text-blackColor dark:text-blackColor-dark cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('assignedDate')}
              >
                <div className="flex items-center gap-2">
                  Assigned Date
                  {getSortIcon('assignedDate')}
                </div>
              </th>
              <th
                className="px-5 py-3 text-sm font-semibold text-blackColor dark:text-blackColor-dark cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('assignedBy')}
              >
                <div className="flex items-center gap-2">
                  Assigned By
                  {getSortIcon('assignedBy')}
                </div>
              </th>
              <th className="px-5 py-3 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderColor dark:divide-borderColor-dark">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-5 py-10 text-center text-gray-500" role="status" aria-live="polite">
                  <NoData message="No assignments found matching your filters" />
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="px-5 py-3 text-sm text-contentColor dark:text-contentColor-dark">
                    <div className="font-medium text-blackColor dark:text-blackColor-dark">
                      {item.course?.title || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      ID: {item.course?.id?.substring(0, 8) || 'N/A'}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-contentColor dark:text-contentColor-dark">
                    {item.instructor?.name || 'N/A'}
                  </td>
                  <td className="px-5 py-3 text-sm text-contentColor dark:text-contentColor-dark">
                    <div className="font-medium">
                      {item.assignedTo?.name || 'N/A'}
                    </div>
                    {item.assignedTo?.details && (
                      <div className="text-xs text-gray-500">
                        {item.assignedTo.details}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        item.assignmentType === 'main'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}
                    >
                      {item.assignmentType === 'main' ? 'Main' : 'Assigned'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-contentColor dark:text-contentColor-dark">
                    {formatDate(item.assignedDate)}
                  </td>
                  <td className="px-5 py-3 text-sm text-contentColor dark:text-contentColor-dark">
                    <div>{item.assignedBy?.name || 'N/A'}</div>
                    <div className="text-xs text-gray-500">
                      {item.assignedBy?.role || ''}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        item.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {item.status || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of{' '}
            {filteredAndSortedData.length} assignments
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primaryColor focus:ring-offset-2"
              aria-label="Go to previous page"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="px-4 py-2 border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primaryColor focus:ring-offset-2"
              aria-label="Go to next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(ReportTable);

