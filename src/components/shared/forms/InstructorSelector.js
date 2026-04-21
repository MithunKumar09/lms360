/**
 * Instructor Selector Component
 * 
 * Multi-select dropdown for instructors with checkboxes, search and pagination.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import AdvancedDropdown from './AdvancedDropdown';
import { useInstructors } from '@/hooks/api/useCourseFormData';
import { useAuthStore } from '@/store/index.js';

const InstructorSelector = ({
  value = [],
  onChange,
  label = 'Instructors',
  placeholder = 'Select instructors...',
  className = '',
  error,
  disabled = false,
  organizationId = null, // Organization ID from course form (for superadmin)
  classIds = [], // Class IDs to filter instructors (for instructor role - only show instructors who hold same classes)
}) => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const userOrgId = user?.orgId;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Determine which orgId to use
  // For admin/instructor: always use their orgId (API will enforce this anyway)
  // For superadmin: use the selected organizationId from the form (if provided)
  const effectiveOrgId = (userRole === 'admin' || userRole === 'instructor')
    ? userOrgId 
    : (organizationId !== null ? organizationId : undefined);

  // Build params for API
  const params = {
    page,
    limit: 20,
    search: search || undefined,
    role: 'instructor',
    status: 'active',
    ...(effectiveOrgId !== undefined ? { organizationId: effectiveOrgId } : {}),
    // For instructor role: filter by classIds if provided (only show instructors who hold same classes)
    ...(userRole === 'instructor' && classIds && classIds.length > 0 ? { classIds: classIds.join(',') } : {}),
  };

  // For superadmin, only enable the query if organizationId is selected (optional)
  // For admin, always enable
  const isEnabled = userRole === 'admin' 
    ? true 
    : true; // superadmin can fetch all instructors or filter by org

  const { data, isLoading, error: queryError } = useInstructors(params, {
    enabled: isEnabled,
  });

  // Transform options
  const options = Array.isArray(data?.instructors)
    ? data.instructors
        .filter(instructor => instructor && typeof instructor === 'object' && instructor.id)
        .map((instructor) => {
          // Handle both camelCase and snake_case field names
          const firstName = instructor.firstName || instructor.first_name || '';
          const lastName = instructor.lastName || instructor.last_name || '';
          const displayName = `${firstName} ${lastName}`.trim() || instructor.email || `Instructor ${instructor.id?.substring(0, 8)}`;
          
          return {
            id: instructor.id,
            label: displayName,
            value: instructor.id,
            ...instructor,
          };
        })
    : [];

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
          console.log(`🧹 [InstructorSelector] Removing ${invalidIds.length} non-existent instructor IDs from draft:`, invalidIds);
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
  if (userRole === 'superadmin' && organizationId === null) {
    placeholderText = 'Select organization first (optional)...';
  }

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
      disabled={disabled}
    />
  );
};

export default InstructorSelector;

