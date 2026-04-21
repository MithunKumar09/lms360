/**
 * Class Selector Component
 * 
 * Multi-select dropdown for classes with checkboxes, search and pagination.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import AdvancedDropdown from './AdvancedDropdown';
import { useClasses } from '@/hooks/api/useCourseFormData';
import { useAuthStore } from '@/store/index.js';

const ClassSelector = ({
  value = [],
  onChange,
  label = 'Classes',
  placeholder = 'Select classes...',
  className = '',
  error,
  disabled = false,
  organizationId = null, // Organization ID from course form (for superadmin)
  instructorIds = [], // Instructor IDs - classes are fetched based on instructors
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

  // Build params for API
  // Cohorts use status: 'draft', 'published', 'archived'
  // Default to 'published' (active cohorts)
  const params = {
    page,
    limit: 20,
    search: search || undefined,
    status: 'published', // Cohorts use 'published' not 'active'
    ...(effectiveOrgId !== undefined ? { organizationId: effectiveOrgId } : {}),
    // Filter by instructorIds if provided (instructors hold classes)
    ...(instructorIds && instructorIds.length > 0 ? { instructorIds } : {}),
  };

  // For admin, only enable if instructor is selected (required)
  // For superadmin, enable if organizationId is selected OR if no org selected (optional)
  const isEnabled = userRole === 'admin' 
    ? (instructorIds.length > 0) // admin requires instructor
    : (organizationId !== null || organizationId === null); // superadmin can work with or without org

  const { data, isLoading, error: queryError } = useClasses(params, {
    enabled: isEnabled,
  });

  // Track last cleaned value to avoid infinite loops
  const lastCleanedRef = useRef(null);

  // Transform options
  // Cohorts have: code, program_node_title, program_node_code, section_label, term_label, session_code
  // Build a display label from available fields (e.g., "2nd PUC - Section A (Term 1)")
  const options = (data?.classes || []).map((classItem) => {
    // Try to build a meaningful label from cohort data
    let label = '';
    
    // Priority: code > program_node_title + section > program_node_code + section > id
    if (classItem.code) {
      label = classItem.code;
      // Add section if available
      if (classItem.section_label) {
        label += ` - ${classItem.section_label}`;
      }
      // Add term if available
      if (classItem.term_label) {
        label += ` (${classItem.term_label})`;
      }
    } else if (classItem.program_node_title) {
      label = classItem.program_node_title;
      if (classItem.section_label) {
        label += ` - ${classItem.section_label}`;
      }
      if (classItem.term_label) {
        label += ` (${classItem.term_label})`;
      }
    } else if (classItem.program_node_code) {
      label = classItem.program_node_code;
      if (classItem.section_label) {
        label += ` - ${classItem.section_label}`;
      }
    } else if (classItem.name) {
      label = classItem.name;
    } else if (classItem.className) {
      label = classItem.className;
    } else {
      label = `Class ${classItem.id?.substring(0, 8) || 'Unknown'}`;
    }
    
    return {
      id: classItem.id,
      label: label,
      value: classItem.id,
      ...classItem,
    };
  });

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
          console.log(`🧹 [ClassSelector] Removing ${invalidIds.length} non-existent class IDs from draft:`, invalidIds);
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
  if (userRole === 'admin' && instructorIds.length === 0) {
    placeholderText = 'Select instructor first...';
  } else if (userRole === 'superadmin' && organizationId === null) {
    placeholderText = 'Select organization first (optional)...';
  }

  // For admin, disable if no instructor is selected
  // For superadmin, allow even without org (optional)
  const isDisabled = disabled || (userRole === 'admin' && instructorIds.length === 0);

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

export default ClassSelector;

