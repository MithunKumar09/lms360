/**
 * Subject Selector Component
 * 
 * Multi-select dropdown for subjects with checkboxes, search and pagination.
 * Dependent on class selection.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import AdvancedDropdown from './AdvancedDropdown';
import { useSubjects } from '@/hooks/api/useCourseFormData';
import { useAuthStore } from '@/store/index.js';

const SubjectSelector = ({
  classIds = [],
  value = [],
  onChange,
  label = 'Subjects',
  placeholder = 'Select subjects...',
  className = '',
  error,
  disabled = false,
  organizationId = null, // Organization ID from course form (for superadmin)
  instructorIds = [], // Instructor IDs - subjects are fetched based on instructors
}) => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const userOrgId = user?.orgId;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Determine which orgId to use
  // For admin: always use their orgId
  // For superadmin: use the selected organizationId from the form (if provided)
  const effectiveOrgId = userRole === 'admin' 
    ? userOrgId 
    : (organizationId !== null ? organizationId : undefined);

  // Reset value when classes change
  useEffect(() => {
    if (classIds.length === 0 && value.length > 0) {
      onChange([]);
    }
  }, [classIds]);

  // Build params for API
  const params = {
    classIds: classIds.length > 0 ? classIds : undefined,
    page,
    limit: 20,
    search: search || undefined,
    status: 'active',
    ...(effectiveOrgId !== undefined ? { organizationId: effectiveOrgId } : {}),
    // Filter by instructorIds if provided (instructors hold subjects)
    ...(instructorIds && instructorIds.length > 0 ? { instructorIds } : {}),
  };

  // For admin, only enable if classes are selected (instructor is already required for classes)
  // For superadmin, enable if classes are selected
  const isEnabled = classIds.length > 0;

  const { data, isLoading, error: queryError } = useSubjects(params, {
    enabled: isEnabled,
  });

  // Transform options
  // Subject catalog has: code, title, category, department_title, department_code
  // Build a display label from available fields
  const options = (data?.subjects || []).map((subject) => {
    // Try to build a meaningful label from subject data
    let label = '';
    
    // Priority: code + title > title > code > name > id
    if (subject.code && subject.title) {
      label = `${subject.code} - ${subject.title}`;
    } else if (subject.title) {
      label = subject.title;
    } else if (subject.code) {
      label = subject.code;
    } else if (subject.name) {
      label = subject.name;
    } else if (subject.subjectName) {
      label = subject.subjectName;
    } else {
      label = `Subject ${subject.id?.substring(0, 8) || 'Unknown'}`;
    }
    
    // Add category if available
    if (subject.category && !label.includes(subject.category)) {
      label += ` (${subject.category})`;
    }
    
    return {
      id: subject.id,
      label: label,
      value: subject.id,
      ...subject,
    };
  });

  // Track last cleaned value to avoid infinite loops
  const lastCleanedRef = useRef(null);

  // Auto-clean non-existent IDs from draft when options are loaded
  useEffect(() => {
    // Only run if data is loaded and not currently loading
    if (!isLoading && data && options.length > 0 && Array.isArray(value) && value.length > 0) {
      // Get all available option IDs
      const availableIds = new Set(options.map(opt => opt.id));
      
      // Find selected IDs that don't exist in current options
      const invalidIds = value.filter(id => id != null && !availableIds.has(id));
      
      // If there are invalid IDs, clean them from the draft
      if (invalidIds.length > 0) {
        const cleanedValue = value.filter(id => id != null && availableIds.has(id));
        const valueKey = JSON.stringify(value.sort());
        
        // Only clean if we haven't cleaned this exact value before
        if (lastCleanedRef.current !== valueKey && cleanedValue.length !== value.length) {
          lastCleanedRef.current = valueKey;
          console.log(`🧹 [SubjectSelector] Removing ${invalidIds.length} non-existent subject IDs from draft:`, invalidIds);
          onChange(cleanedValue);
        }
      } else {
        // Reset when all values are valid
        lastCleanedRef.current = null;
      }
    }
  }, [data, isLoading, options, value, onChange]);

  // Handle search
  const handleSearch = (searchTerm) => {
    setSearch(searchTerm);
    setPage(1);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  // Determine placeholder and disabled state
  let placeholderText = placeholder;
  if (classIds.length === 0) {
    placeholderText = 'Select classes first...';
  }

  const isDisabled = disabled || classIds.length === 0;

  return (
    <AdvancedDropdown
      options={options}
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholderText}
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
      disabled={isDisabled}
    />
  );
};

export default SubjectSelector;

