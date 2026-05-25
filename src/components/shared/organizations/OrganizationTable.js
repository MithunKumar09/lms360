/**
 * Organization Table Component
 * 
 * Table view component for displaying organizations list.
 * Includes actions: View, Edit, Delete
 * 
 * @module organizations/OrganizationTable
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import useSweetAlert from '@/hooks/useSweetAlert';
import Link from 'next/link';

/**
 * Organization Table Component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.organizations - Organizations array
 * @param {Array} props.selectedIds - Selected organization IDs
 * @param {Function} props.onSelect - Select handler
 * @param {Function} props.onSelectAll - Select all handler
 * @param {Function} props.onDelete - Delete handler
 * @param {boolean} props.loading - Loading state
 */
export default function OrganizationTable({
  organizations = [],
  selectedIds = [],
  onSelect,
  onSelectAll,
  onDelete,
  loading = false,
}) {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const [deletingId, setDeletingId] = useState(null);

  /**
   * Handle delete with confirmation
   */
  const handleDelete = async (id, name) => {
    const confirmed = await createAlert(
      'warning',
      `Are you sure you want to delete "${name}"?`,
      'This action cannot be undone.',
      true
    );

    if (confirmed) {
      setDeletingId(id);
      try {
        if (onDelete) {
          await onDelete(id);
        }
        createAlert('success', 'Organization deleted successfully');
      } catch (error) {
        createAlert('error', error.message || 'Failed to delete organization');
      } finally {
        setDeletingId(null);
      }
    }
  };

  /**
   * Get status badge class
   */
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400';
      case 'inactive':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400';
      case 'suspended':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400';
    }
  };

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  /**
   * Get org type label
   */
  const getOrgTypeLabel = (type) => {
    const types = {
      college: 'College',
      university: 'University',
      institute: 'Institute',
      department: 'Department',
      training_center: 'Training Center',
    };
    return types[type] || type;
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
                  <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="p-15px">
                  <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
                <td className="p-15px">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
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

  if (organizations.length === 0) {
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
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <p className="text-contentColor dark:text-contentColor-dark text-size-18 font-medium mb-10px">
          No organizations found
        </p>
        <p className="text-contentColor dark:text-contentColor-dark text-sm opacity-70 mb-30px">
          Get started by creating a new organization
        </p>
        <Link
          href="/dashboards/superadmin-organizations/new"
          className="inline-block px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors"
        >
          Create Organization
        </Link>
      </div>
    );
  }

  const allSelected = organizations.length > 0 && selectedIds.length === organizations.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < organizations.length;

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
                aria-label="Select all organizations"
              />
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Name
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Type
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Code
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Location
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Status
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Domain
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Created At
            </th>
            <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {organizations.map((org) => {
            const isSelected = selectedIds.includes(org.id);
            const isDeleting = deletingId === org.id;
            const brandAsset = org.brandAssets?.find((a) => a.key_name === 'square_icon') || 
                              org.brandAssets?.find((a) => a.key_name === 'header_logo');

            return (
              <tr
                key={org.id}
                className={`border-b border-borderColor dark:border-borderColor-dark hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors ${
                  isSelected ? 'bg-primaryColor/5 dark:bg-primaryColor/10' : ''
                } ${isDeleting ? 'opacity-50' : ''}`}
              >
                <td className="p-15px">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (onSelect) {
                        onSelect(org.id, e.target.checked);
                      }
                    }}
                    className="w-4 h-4 text-primaryColor border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor"
                    aria-label={`Select ${org.name}`}
                  />
                </td>
                <td className="p-15px">
                  <div className="flex items-center gap-10px">
                    {brandAsset?.url && (
                      <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={brandAsset.url}
                          alt={org.name}
                          fill
                          className="object-contain"
                          unoptimized={brandAsset.url.startsWith('http') || brandAsset.url.startsWith('//')}
                        />
                      </div>
                    )}
                    <div>
                      <p className="text-contentColor dark:text-contentColor-dark font-medium text-sm">
                        {org.display_name || org.name}
                      </p>
                      {org.display_name && (
                        <p className="text-contentColor dark:text-contentColor-dark text-xs opacity-70">
                          {org.name}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-15px">
                  <span className="text-contentColor dark:text-contentColor-dark text-sm">
                    {getOrgTypeLabel(org.org_type)}
                  </span>
                </td>
                <td className="p-15px">
                  <span className="text-contentColor dark:text-contentColor-dark text-sm font-mono">
                    {org.org_code}
                  </span>
                </td>
                <td className="p-15px">
                  <div className="text-contentColor dark:text-contentColor-dark text-sm">
                    <p>{org.city}</p>
                    {org.state && (
                      <p className="text-xs opacity-70">
                        {org.state}, {org.country}
                      </p>
                    )}
                  </div>
                </td>
                <td className="p-15px">
                  <span
                    className={`inline-block px-10px py-5px text-xs font-medium rounded ${getStatusBadgeClass(org.status)}`}
                  >
                    {org.status?.charAt(0).toUpperCase() + org.status?.slice(1) || 'Active'}
                  </span>
                </td>
                <td className="p-15px">
                  <div className="space-y-4px">
                    {org.subdomain && (
                      <p className="text-xs font-mono text-contentColor dark:text-contentColor-dark">
                        {org.subdomain}.*
                      </p>
                    )}
                    {org.custom_domain ? (
                      <div className="flex items-center gap-6px">
                        <p className="text-xs font-mono text-contentColor dark:text-contentColor-dark">
                          {org.custom_domain}
                        </p>
                        <span className={`px-6px py-2px rounded-full text-xs font-semibold ${
                          org.ssl_status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : org.ssl_status === 'failed'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            : org.ssl_status === 'provisioning'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {org.domain_verified ? org.ssl_status : 'unverified'}
                        </span>
                      </div>
                    ) : (
                      !org.subdomain && (
                        <p className="text-xs text-contentColor dark:text-contentColor-dark opacity-40">—</p>
                      )
                    )}
                  </div>
                </td>
                <td className="p-15px">
                  <span className="text-contentColor dark:text-contentColor-dark text-sm">
                    {formatDate(org.created_at)}
                  </span>
                </td>
                <td className="p-15px">
                  <div className="flex items-center gap-10px">
                    <Link
                      href={`/dashboards/superadmin-organizations/${org.id}/edit`}
                      className="text-primaryColor dark:text-primaryColor hover:text-primaryColor/80 transition-colors"
                      aria-label={`Edit ${org.name}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(org.id, org.name)}
                      disabled={isDeleting}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Delete ${org.name}`}
                    >
                      {isDeleting ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

