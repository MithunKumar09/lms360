/**
 * Program Type Selector Component
 * 
 * Single-select dropdown for program types with search and pagination.
 */

'use client';

import React, { useState } from 'react';
import AdvancedDropdown from './AdvancedDropdown';
import { useProgramTypes } from '@/hooks/api/useCourseSettings';
import { useAuthStore } from '@/store/index.js';

const ProgramTypeSelector = ({
  value,
  onChange,
  label = 'Program Type',
  placeholder = 'Select program type...',
  className = '',
  error,
  disabled = false,
}) => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const userOrgId = user?.orgId;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Build params for API
  const params = {
    page,
    limit: 20,
    search: search || undefined,
    status: 1,
    ...(userRole === 'admin' && userOrgId ? { org_id: userOrgId } : {}),
  };

  const { data, isLoading, error: queryError } = useProgramTypes(params);

  // Transform options
  const options = (data?.programTypes || []).map((programType) => ({
    id: programType.id,
    label: programType.name,
    value: programType.id,
    ...programType,
  }));

  // Handle search
  const handleSearch = (searchTerm) => {
    setSearch(searchTerm);
    setPage(1);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

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

export default ProgramTypeSelector;

