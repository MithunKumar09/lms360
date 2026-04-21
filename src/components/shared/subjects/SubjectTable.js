/**
 * Subject Table Component
 * 
 * Table view component for displaying subjects list.
 * Includes actions: View, Edit, Archive
 * 
 * @module subjects/SubjectTable
 */

'use client';

import { useState } from 'react';
import useSweetAlert from '@/hooks/useSweetAlert';
import Swal from 'sweetalert2';

/**
 * Subject Table Component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.subjects - Subjects array
 * @param {Array} props.selectedIds - Selected subject IDs
 * @param {Function} props.onSelect - Select handler
 * @param {Function} props.onSelectAll - Select all handler
 * @param {Function} props.onEdit - Edit handler
 * @param {Function} props.onArchive - Archive handler
 * @param {Function} props.onView - View details handler
 * @param {boolean} props.loading - Loading state
 * @param {string} props.userRole - User role (superadmin/admin)
 */
export default function SubjectTable({
  subjects = [],
  selectedIds = [],
  onSelect,
  onSelectAll,
  onEdit,
  onArchive,
  onView,
  loading = false,
  userRole = 'superadmin',
}) {
  const createAlert = useSweetAlert();
  const [archivingId, setArchivingId] = useState(null);

  /**
   * Get category badge class
   */
  const getCategoryBadgeClass = (category) => {
    const classes = {
      core: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400',
      elective: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400',
      lab: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400',
      mandatory: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400',
      project: 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400',
      internship: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400',
      aecc: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-400',
      sec: 'bg-pink-100 dark:bg-pink-900/20 text-pink-800 dark:text-pink-400',
      open_elective: 'bg-teal-100 dark:bg-teal-900/20 text-teal-800 dark:text-teal-400',
      prof_elective: 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-400',
    };
    return classes[category] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400';
  };

  /**
   * Get category label
   */
  const getCategoryLabel = (category) => {
    const labels = {
      core: 'Core',
      elective: 'Elective',
      lab: 'Lab',
      mandatory: 'Mandatory',
      project: 'Project',
      internship: 'Internship',
      aecc: 'AECC',
      sec: 'SEC',
      open_elective: 'Open Elective',
      prof_elective: 'Professional Elective',
    };
    return labels[category] || category;
  };

  /**
   * Handle archive with confirmation
   */
  const handleArchive = async (id, title, isArchived) => {
    const result = await Swal.fire({
      title: isArchived ? 'Unarchive Subject' : 'Archive Subject',
      text: `Are you sure you want to ${isArchived ? 'unarchive' : 'archive'} "${title}"?`,
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
        createAlert('success', `Subject ${isArchived ? 'unarchived' : 'archived'} successfully`);
      } catch (error) {
        createAlert('error', error.message || `Failed to ${isArchived ? 'unarchive' : 'archive'} subject`);
      } finally {
        setArchivingId(null);
      }
    }
  };

  /**
   * Check if subject is locked (admin cannot edit superadmin-locked subjects)
   */
  const isLocked = (subject) => {
    if (userRole === 'admin' && subject.locked_fields?.includes('code')) {
      return true;
    }
    return false;
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
                <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>
              <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>
              <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>
              <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>
              <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>
              <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
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
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="p-15px">
                  <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="p-15px">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="p-15px">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="p-15px">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
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

  if (subjects.length === 0) {
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
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <p className="text-contentColor dark:text-contentColor-dark text-size-18 font-medium mb-10px">
          No subjects found
        </p>
        <p className="text-contentColor dark:text-contentColor-dark text-sm opacity-70">
          Get started by creating a new subject
        </p>
      </div>
    );
  }

  const allSelected = subjects.length > 0 && selectedIds.length === subjects.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < subjects.length;

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
                aria-label="Select all subjects"
              />
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Code
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Title
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Category
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Credits
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Level
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Department
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => {
            const isSelected = selectedIds.includes(subject.id);
            const isArchiving = archivingId === subject.id;
            const locked = isLocked(subject);
            const isArchived = subject.status === 'archived';

            return (
              <tr
                key={subject.id}
                className={`border-b border-borderColor dark:border-borderColor-dark hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors ${
                  isSelected ? 'bg-primaryColor/5 dark:bg-primaryColor/10' : ''
                } ${isArchiving ? 'opacity-50' : ''} ${isArchived ? 'opacity-60' : ''}`}
              >
                <td className="p-15px">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (onSelect) {
                        onSelect(subject.id, e.target.checked);
                      }
                    }}
                    className="w-4 h-4 text-primaryColor border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor"
                    aria-label={`Select ${subject.title}`}
                  />
                </td>
                <td className="p-15px">
                  <span className="text-contentColor dark:text-contentColor-dark text-sm font-mono font-medium">
                    {subject.code}
                  </span>
                </td>
                <td className="p-15px">
                  <div>
                    <p className="text-contentColor dark:text-contentColor-dark font-medium text-sm">
                      {subject.title}
                    </p>
                    {subject.description && (
                      <p className="text-contentColor dark:text-contentColor-dark text-xs opacity-70 mt-5px line-clamp-1">
                        {subject.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="p-15px">
                  <span
                    className={`inline-block px-10px py-5px text-xs font-medium rounded ${getCategoryBadgeClass(subject.category)}`}
                  >
                    {getCategoryLabel(subject.category)}
                  </span>
                </td>
                <td className="p-15px">
                  <span className="text-contentColor dark:text-contentColor-dark text-sm">
                    {subject.credits || '-'}
                  </span>
                </td>
                <td className="p-15px">
                  <span className="text-contentColor dark:text-contentColor-dark text-sm capitalize">
                    {subject.level?.replace('_', ' ') || '-'}
                  </span>
                </td>
                <td className="p-15px">
                  <span className="text-contentColor dark:text-contentColor-dark text-sm">
                    {subject.department_node?.title || '-'}
                  </span>
                </td>
                <td className="p-15px">
                  <div className="flex items-center gap-10px">
                    <button
                      type="button"
                      onClick={() => onView && onView(subject)}
                      className="text-primaryColor dark:text-primaryColor hover:text-primaryColor/80 transition-colors"
                      aria-label={`View ${subject.title}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit && onEdit(subject)}
                      disabled={locked || isArchiving}
                      className={`transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        locked
                          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          : 'text-primaryColor dark:text-primaryColor hover:text-primaryColor/80'
                      }`}
                      aria-label={`Edit ${subject.title}`}
                      title={locked ? 'This subject is locked and cannot be edited' : 'Edit subject'}
                    >
                      {locked ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchive(subject.id, subject.title, isArchived)}
                      disabled={isArchiving}
                      className={`transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isArchived
                          ? 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300'
                          : 'text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300'
                      }`}
                      aria-label={isArchived ? `Unarchive ${subject.title}` : `Archive ${subject.title}`}
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

