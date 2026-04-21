/**
 * Class (Cohort) Table Component
 * 
 * Table view component for displaying classes list.
 * Includes actions: View, Edit, Publish/Unpublish, Archive
 * 
 * @module classes/ClassTable
 */

'use client';

import { useState } from 'react';
import useSweetAlert from '@/hooks/useSweetAlert';
import Swal from 'sweetalert2';

/**
 * Class Table Component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.classes - Classes array
 * @param {Array} props.selectedIds - Selected class IDs
 * @param {Function} props.onSelect - Select handler
 * @param {Function} props.onSelectAll - Select all handler
 * @param {Function} props.onView - View details handler
 * @param {Function} props.onEdit - Edit handler
 * @param {Function} props.onPublish - Publish handler
 * @param {Function} props.onArchive - Archive handler
 * @param {boolean} props.loading - Loading state
 * @param {string} props.userRole - User role (superadmin/admin)
 * @param {Function} props.onSort - Sort handler (column, order)
 * @param {string} props.sortColumn - Current sort column
 * @param {string} props.sortOrder - Current sort order (ASC/DESC)
 */
export default function ClassTable({
  classes = [],
  selectedIds = [],
  onSelect,
  onSelectAll,
  onView,
  onEdit,
  onPublish,
  onArchive,
  loading = false,
  userRole = 'superadmin',
  onSort,
  sortColumn = '',
  sortOrder = 'DESC',
}) {
  const createAlert = useSweetAlert();
  const [publishingId, setPublishingId] = useState(null);
  const [archivingId, setArchivingId] = useState(null);

  /**
   * Get status badge class
   */
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400';
      case 'draft':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400';
      case 'archived':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400';
    }
  };

  /**
   * Get level label
   */
  const getLevelLabel = (level) => {
    const labels = {
      primary: 'Primary',
      high_school: 'High School',
      puc: 'PUC',
      diploma: 'Diploma',
      degree: 'Degree',
      engineering: 'Engineering',
      post_graduation: 'Post Graduation',
    };
    return labels[level] || level;
  };

  /**
   * Handle sort
   */
  const handleSort = (column) => {
    if (!onSort) return;
    const newOrder = sortColumn === column && sortOrder === 'ASC' ? 'DESC' : 'ASC';
    onSort(column, newOrder);
  };

  /**
   * Get sort icon
   */
  const getSortIcon = (column) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-4 h-4 inline-block ml-5px opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'ASC' ? (
      <svg className="w-4 h-4 inline-block ml-5px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 inline-block ml-5px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  /**
   * Handle publish with confirmation
   */
  const handlePublish = async (id, isPublished) => {
    const result = await Swal.fire({
      title: isPublished ? 'Unpublish Class' : 'Publish Class',
      text: `Are you sure you want to ${isPublished ? 'unpublish' : 'publish'} this class?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: isPublished ? 'Unpublish' : 'Publish',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
    });

    if (result.isConfirmed) {
      setPublishingId(id);
      try {
        if (onPublish) {
          await onPublish(id, !isPublished);
        }
        createAlert('success', `Class ${isPublished ? 'unpublished' : 'published'} successfully`);
      } catch (error) {
        createAlert('error', error.message || `Failed to ${isPublished ? 'unpublish' : 'publish'} class`);
      } finally {
        setPublishingId(null);
      }
    }
  };

  /**
   * Handle archive with confirmation
   */
  const handleArchive = async (id, isArchived) => {
    const result = await Swal.fire({
      title: isArchived ? 'Unarchive Class' : 'Archive Class',
      text: `Are you sure you want to ${isArchived ? 'unarchive' : 'archive'} this class?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: isArchived ? 'Unarchive' : 'Archive',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
    });

    if (result.isConfirmed) {
      setArchivingId(id);
      try {
        if (onArchive) {
          await onArchive(id, !isArchived);
        }
        createAlert('success', `Class ${isArchived ? 'unarchived' : 'archived'} successfully`);
      } catch (error) {
        createAlert('error', error.message || `Failed to ${isArchived ? 'unarchive' : 'archive'} class`);
      } finally {
        setArchivingId(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-borderColor dark:border-borderColor-dark">
              <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>
              <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>
              <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>
              <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>
              <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>
              <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>
              <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>
              <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>
              <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, idx) => (
              <tr key={idx} className="border-b border-borderColor dark:border-borderColor-dark">
                <td className="p-15px">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="p-15px">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="p-15px">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="p-15px">
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="p-15px">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="p-15px">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="p-15px">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="p-15px">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="p-15px">
                  <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="text-center py-60px">
        <svg
          className="mx-auto h-16 w-16 text-contentColor dark:text-contentColor-dark opacity-50 mb-20px"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <p className="text-contentColor dark:text-contentColor-dark text-size-18 font-medium mb-10px">
          No classes found
        </p>
        <p className="text-contentColor dark:text-contentColor-dark text-sm opacity-70">
          Get started by creating a new class
        </p>
      </div>
    );
  }

  const allSelected = classes.length > 0 && selectedIds.length === classes.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < classes.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-borderColor dark:border-borderColor-dark bg-gray-50 dark:bg-gray-900/50">
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected;
                }}
                onChange={(e) => {
                  if (onSelectAll) {
                    onSelectAll(e.target.checked);
                  }
                }}
                className="w-4 h-4 text-primaryColor border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor"
                aria-label="Select all classes"
              />
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              <button
                type="button"
                onClick={() => handleSort('code')}
                className="flex items-center hover:text-primaryColor dark:hover:text-primaryColor transition-colors"
              >
                Code
                {getSortIcon('code')}
              </button>
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              <button
                type="button"
                onClick={() => handleSort('level')}
                className="flex items-center hover:text-primaryColor dark:hover:text-primaryColor transition-colors"
              >
                Level
                {getSortIcon('level')}
              </button>
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Program/Combination
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              <button
                type="button"
                onClick={() => handleSort('term_id')}
                className="flex items-center hover:text-primaryColor dark:hover:text-primaryColor transition-colors"
              >
                Term
                {getSortIcon('term_id')}
              </button>
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Section
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Session
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              <button
                type="button"
                onClick={() => handleSort('status')}
                className="flex items-center hover:text-primaryColor dark:hover:text-primaryColor transition-colors"
              >
                Status
                {getSortIcon('status')}
              </button>
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Subjects
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {classes.map((cohort) => {
            const isSelected = selectedIds.includes(cohort.id);
            const isPublishing = publishingId === cohort.id;
            const isArchiving = archivingId === cohort.id;
            const isPublished = cohort.status === 'published';
            const isArchived = cohort.status === 'archived';

            return (
              <tr
                key={cohort.id}
                className={`border-b border-borderColor dark:border-borderColor-dark hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors ${
                  isSelected ? 'bg-primaryColor/5 dark:bg-primaryColor/10' : ''
                } ${isPublishing || isArchiving ? 'opacity-50' : ''} ${isArchived ? 'opacity-60' : ''}`}
              >
                <td className="p-15px">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (onSelect) {
                        onSelect(cohort.id, e.target.checked);
                      }
                    }}
                    className="w-4 h-4 text-primaryColor border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor"
                    aria-label={`Select ${cohort.code}`}
                  />
                </td>
                <td className="p-15px">
                  <span className="text-contentColor dark:text-contentColor-dark text-sm font-mono font-medium">
                    {cohort.code}
                  </span>
                </td>
                <td className="p-15px">
                  <span className="text-contentColor dark:text-contentColor-dark text-sm">
                    {getLevelLabel(cohort.level)}
                  </span>
                </td>
                <td className="p-15px">
                  <div>
                    <p className="text-contentColor dark:text-contentColor-dark font-medium text-sm">
                      {cohort.program_node?.title || '-'}
                    </p>
                    {cohort.program_node?.code && (
                      <p className="text-contentColor dark:text-contentColor-dark text-xs opacity-70">
                        {cohort.program_node.code}
                      </p>
                    )}
                  </div>
                </td>
                <td className="p-15px">
                  <span className="text-contentColor dark:text-contentColor-dark text-sm">
                    {cohort.term?.label || '-'}
                  </span>
                </td>
                <td className="p-15px">
                  <span className="text-contentColor dark:text-contentColor-dark text-sm font-medium">
                    {cohort.section?.label || '-'}
                  </span>
                </td>
                <td className="p-15px">
                  <span className="text-contentColor dark:text-contentColor-dark text-sm">
                    {cohort.session?.code || '-'}
                  </span>
                </td>
                <td className="p-15px">
                  <span
                    className={`inline-block px-10px py-5px text-xs font-medium rounded ${getStatusBadgeClass(cohort.status)}`}
                  >
                    {cohort.status?.charAt(0).toUpperCase() + cohort.status?.slice(1) || 'Draft'}
                  </span>
                </td>
                <td className="p-15px">
                  <span className="text-contentColor dark:text-contentColor-dark text-sm">
                    {cohort.total_subjects || 0}
                  </span>
                </td>
                <td className="p-15px">
                  <div className="flex items-center gap-10px">
                    <button
                      type="button"
                      onClick={() => onView && onView(cohort)}
                      className="text-primaryColor dark:text-primaryColor hover:text-primaryColor/80 transition-colors"
                      aria-label={`View ${cohort.code}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit && onEdit(cohort)}
                      disabled={isPublishing || isArchiving}
                      className="text-primaryColor dark:text-primaryColor hover:text-primaryColor/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Edit ${cohort.code}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePublish(cohort.id, isPublished)}
                      disabled={isPublishing || isArchiving}
                      className={`transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isPublished
                          ? 'text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300'
                          : 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300'
                      }`}
                      aria-label={isPublished ? `Unpublish ${cohort.code}` : `Publish ${cohort.code}`}
                    >
                      {isPublishing ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : isPublished ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchive(cohort.id, isArchived)}
                      disabled={isPublishing || isArchiving}
                      className={`transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isArchived
                          ? 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300'
                          : 'text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300'
                      }`}
                      aria-label={isArchived ? `Unarchive ${cohort.code}` : `Archive ${cohort.code}`}
                    >
                      {isArchiving ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : isArchived ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

