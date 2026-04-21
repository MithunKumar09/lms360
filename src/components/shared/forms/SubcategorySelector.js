/**
 * Subcategory Selector Component
 * 
 * Single-select dropdown for course subcategories with search and pagination.
 * Dependent on category selection.
 */

'use client';

import React, { useState, useEffect } from 'react';
import AdvancedDropdown from './AdvancedDropdown';
import { useSubcategories } from '@/hooks/api/useCourseSettings';
import { useAuthStore } from '@/store/index.js';

const SubcategorySelector = ({
  categoryId,
  value,
  onChange,
  label = 'Subcategory',
  placeholder = 'Select subcategory...',
  className = '',
  error,
  disabled = false,
}) => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const userOrgId = user?.orgId;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Reset value when category changes
  useEffect(() => {
    if (categoryId && value) {
      // Optionally clear value if it's not valid for the new category
      // For now, we'll keep it and let the API filter
    } else if (!categoryId) {
      onChange(null);
    }
  }, [categoryId]);

  // Build params for API
  const params = {
    categoryId: categoryId || undefined,
    page,
    limit: 20,
    search: search || undefined,
    status: 1, // Only active subcategories
    ...(userRole === 'admin' && userOrgId ? { org_id: userOrgId } : {}),
  };

  const { data, isLoading, error: queryError } = useSubcategories(params, {
    enabled: !!categoryId, // Only fetch if category is selected
  });

  // Transform options
  const options = (data?.subcategories || []).map((subcategory) => ({
    id: subcategory.id,
    label: subcategory.name,
    value: subcategory.id,
    ...subcategory,
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
      placeholder={categoryId ? placeholder : 'Select category first...'}
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
      disabled={disabled || !categoryId}
    />
  );
};

export default SubcategorySelector;

