/**
 * Category Selector Component
 * 
 * Single-select dropdown for course categories with search and pagination.
 */

'use client';

import React, { useState } from 'react';
import AdvancedDropdown from './AdvancedDropdown';
import { useCategories } from '@/hooks/api/useCourseSettings';
import { useAuthStore } from '@/store/index.js';

const CategorySelector = ({
  value,
  onChange,
  label = 'Category',
  placeholder = 'Select category...',
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
    status: 1, // Only active categories
    ...(userRole === 'admin' && userOrgId ? { org_id: userOrgId } : {}),
  };

  const { data, isLoading, error: queryError } = useCategories(params);

  // Transform options
  const options = (data?.categories || []).map((category) => ({
    id: category.id,
    label: category.name,
    value: category.id,
    ...category,
  }));

  // Handle search
  const handleSearch = (searchTerm) => {
    setSearch(searchTerm);
    setPage(1); // Reset to first page on new search
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

export default CategorySelector;

