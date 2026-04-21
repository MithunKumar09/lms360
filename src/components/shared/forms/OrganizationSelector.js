/**
 * Organization Selector Component
 * 
 * Single-select dropdown for organizations with search and pagination.
 * Only visible for superadmin.
 */

'use client';

import React, { useState } from 'react';
import AdvancedDropdown from './AdvancedDropdown';
import { useOrganizations } from '@/hooks/api/useCourseFormData';
import { useAuthStore } from '@/store/index.js';

const OrganizationSelector = ({
  value,
  onChange,
  label = 'Organization',
  placeholder = 'Select organization or leave for global...',
  className = '',
  error,
  disabled = false,
}) => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const isSuperadmin = userRole === 'superadmin';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Build params for API
  const params = {
    page,
    limit: 20,
    search: search || undefined,
    status: 'active',
  };

  const { data, isLoading, error: queryError } = useOrganizations(params, {
    enabled: isSuperadmin, // Only fetch if superadmin
  });

  // Add "Global" option for superadmin
  const globalOption = {
    id: null,
    label: 'Global (All Organizations)',
    value: null,
  };

  // Transform options
  const options = [
    globalOption,
    ...(data?.organizations || []).map((org) => ({
      id: org.id,
      label: org.name || org.organizationName || `Organization ${org.id}`,
      value: org.id,
      ...org,
    })),
  ];

  // Handle search
  const handleSearch = (searchTerm) => {
    setSearch(searchTerm);
    setPage(1);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  // Don't render if not superadmin
  // Admin users will have their organization auto-assigned
  if (!isSuperadmin) {
    return null;
  }

  return (
    <AdvancedDropdown
      options={options}
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder}
      multiple={false}
      searchable={true}
      paginated={true}
      pagination={data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 }}
      onPageChange={handlePageChange}
      onSearch={handleSearch}
      loading={isLoading}
      error={
        error
          ? typeof error === 'string'
            ? error
            : error?.message || String(error)
          : queryError
            ? typeof queryError === 'string'
              ? queryError
              : queryError?.message || String(queryError)
            : null
      }
      className={className}
      disabled={disabled}
    />
  );
};

export default OrganizationSelector;

