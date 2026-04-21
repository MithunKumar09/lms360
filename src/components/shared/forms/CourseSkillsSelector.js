/**
 * Course Skills Selector Component
 * 
 * Multi-select dropdown for course skills with checkboxes, search and pagination.
 */

'use client';

import React, { useState } from 'react';
import AdvancedDropdown from './AdvancedDropdown';
import { useCourseSkills } from '@/hooks/api/useCourseSettings';
import { useAuthStore } from '@/store/index.js';

const CourseSkillsSelector = ({
  value = [],
  onChange,
  label = 'Course Skills',
  placeholder = 'Select skills...',
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

  const { data, isLoading, error: queryError } = useCourseSkills(params);

  // Transform options
  const options = (data?.skills || []).map((skill) => ({
    id: skill.id,
    label: skill.name,
    value: skill.id,
    ...skill,
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
      multiple={true}
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

export default CourseSkillsSelector;

