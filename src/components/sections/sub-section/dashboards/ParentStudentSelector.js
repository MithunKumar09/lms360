"use client";

import { useState, useEffect } from "react";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown";
import { useParentStudents } from "@/hooks/api/useParent";

/**
 * ParentStudentSelector Component
 * 
 * Dropdown component for parents to select which child's data to view.
 * Used across parent dashboard pages to filter data by selected child.
 * 
 * @param {Object} props - Component props
 * @param {string|null} props.value - Selected student ID
 * @param {Function} props.onChange - Change handler (studentId) => void
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showLabel - Whether to show label
 * @param {string} props.placeholder - Placeholder text
 */
const ParentStudentSelector = ({
  value = null,
  onChange,
  className = "",
  showLabel = true,
  placeholder = "Select a child to view...",
}) => {
  const { data, isLoading, error } = useParentStudents();

  // Transform students to dropdown options
  const options = (data?.students || []).map((student) => ({
    id: student.id,
    label: `${student.firstName || ""} ${student.lastName || ""}`.trim() || student.email,
    value: student.id,
    ...student,
  }));

  // Handle selection change
  const handleChange = (selectedValue) => {
    onChange(selectedValue);
  };

  return (
    <div className={className}>
      <AdvancedDropdown
        options={options}
        value={value}
        onChange={handleChange}
        label={showLabel ? "Select Child" : null}
        placeholder={placeholder}
        loading={isLoading}
        error={error}
        disabled={isLoading || options.length === 0}
        searchable={options.length > 5}
        className="w-full"
      />
      {error && (
        <p className="text-red-500 dark:text-red-400 text-sm mt-2">
          {error.message || "Failed to load children"}
        </p>
      )}
      {!isLoading && !error && options.length === 0 && (
        <p className="text-contentColor dark:text-contentColor-dark text-sm mt-2">
          No children linked to your account
        </p>
      )}
    </div>
  );
};

export default ParentStudentSelector;
