"use client";

import React, { useState, useEffect } from 'react';
import { FiX, FiFilter } from 'react-icons/fi';
import AdvancedDropdown from '@/components/shared/forms/AdvancedDropdown.js';
import useCoursesForDropdown from '@/hooks/api/useCoursesForDropdown.js';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';

/**
 * ManageQuizFilterSidebar Component
 * 
 * Enhanced filter sidebar for manage quiz pages with role-specific filters
 * Extends base FilterSidebar with additional role-based options
 */
const ManageQuizFilterSidebar = ({
  isOpen,
  onClose,
  filters = {},
  onFilterChange,
  role = 'instructor',
  className = '',
}) => {
  const [localFilters, setLocalFilters] = useState(filters);

  // Fetch courses for filter (role-based)
  const { data: coursesData } = useCoursesForDropdown();
  const courses = coursesData?.courses || [];

  // Fetch organizations for superadmin
  const { data: orgsData } = useQuery({
    queryKey: ['organizations', 'list'],
    queryFn: async () => {
      const response = await apiClient.get('/organizations');
      return response.organizations || [];
    },
    enabled: role === 'superadmin',
    staleTime: 5 * 60 * 1000,
  });
  const organizations = orgsData || [];

  // Fetch mini courses for admin (if quizType is mini_course)
  const { data: miniCoursesData } = useQuery({
    queryKey: ['mini-courses', 'list', role],
    queryFn: async () => {
      const response = await apiClient.get('/mini-courses?status=published');
      return response.miniCourses || [];
    },
    enabled: role === 'admin' || role === 'superadmin',
    staleTime: 5 * 60 * 1000,
  });
  const miniCourses = miniCoursesData || [];

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterUpdate = (field, value) => {
    const updated = { ...localFilters, [field]: value === 'all' || value === null ? null : value };
    setLocalFilters(updated);
  };

  const handleApplyFilters = () => {
    onFilterChange(localFilters);
    onClose();
  };

  const handleClearFilters = () => {
    const cleared = {
      courseId: null,
      orgId: null,
      status: null,
      quizType: null,
      miniCourseId: null,
      startDate: null,
      endDate: null,
    };
    setLocalFilters(cleared);
    onFilterChange(cleared);
  };

  // Build course options based on role
  const getCourseOptions = () => {
    const baseOptions = [
      { id: 'all', label: 'All Courses', value: null },
    ];

    // For instructor, only show their assigned courses
    if (role === 'instructor') {
      return [
        ...baseOptions,
        ...courses.map((course) => ({
          id: course.id,
          label: course.title,
          value: course.id,
        })),
      ];
    }

    // For admin and superadmin, show all courses + standalone option
    return [
      ...baseOptions,
      { id: 'standalone', label: 'Standalone Quizzes', value: 'standalone' },
      ...courses.map((course) => ({
        id: course.id,
        label: course.title,
        value: course.id,
      })),
    ];
  };

  const courseOptions = getCourseOptions();

  const orgOptions = [
    { id: 'all', label: 'All Organizations', value: null },
    { id: 'global', label: 'Global Quizzes', value: 'global' },
    ...organizations.map((org) => ({
      id: org.id,
      label: org.name,
      value: org.id,
    })),
  ];

  const statusOptions = [
    { id: 'all', label: 'All Status', value: null },
    { id: 'draft', label: 'Draft', value: 'draft' },
    { id: 'published', label: 'Published', value: 'published' },
    { id: 'closed', label: 'Closed', value: 'closed' },
  ];

  // Quiz type options based on role
  const getQuizTypeOptions = () => {
    const baseOptions = [
      { id: 'all', label: 'All Types', value: null },
    ];

    if (role === 'instructor') {
      return [
        ...baseOptions,
        { id: 'main_course', label: 'Main Course', value: 'main_course' },
        { id: 'global', label: 'Global', value: 'global' },
      ];
    }

    // Admin and superadmin can see all types
    return [
      ...baseOptions,
      { id: 'main_course', label: 'Main Course', value: 'main_course' },
      { id: 'mini_course', label: 'Mini Course', value: 'mini_course' },
      { id: 'global', label: 'Global', value: 'global' },
    ];
  };

  const quizTypeOptions = getQuizTypeOptions();

  const miniCourseOptions = [
    { id: 'all', label: 'All Mini Courses', value: null },
    ...miniCourses.map((mc) => ({
      id: mc.id,
      label: mc.title,
      value: mc.id,
    })),
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 right-0 h-full w-80 max-w-[90vw]
          bg-whiteColor dark:bg-whiteColor-dark
          shadow-2xl z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          overflow-y-auto
          ${className}
        `}
      >
        {/* Header */}
        <div className="sticky top-0 bg-whiteColor dark:bg-whiteColor-dark border-b border-borderColor dark:border-borderColor-dark p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <FiFilter className="w-5 h-5 text-primaryColor" />
            <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
              Filters
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close filters"
          >
            <FiX className="w-5 h-5 text-contentColor dark:text-contentColor-dark" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="p-4 space-y-6">
          {/* Organization Filter (Superadmin only) */}
          {role === 'superadmin' && (
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Organization
              </label>
              <AdvancedDropdown
                options={orgOptions}
                value={localFilters.orgId || 'all'}
                onChange={(value) => handleFilterUpdate('orgId', value === 'global' ? 'global' : value)}
                placeholder="All Organizations"
                searchable={true}
              />
            </div>
          )}

          {/* Quiz Type Filter */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Quiz Type
            </label>
            <AdvancedDropdown
              options={quizTypeOptions}
              value={localFilters.quizType || 'all'}
              onChange={(value) => handleFilterUpdate('quizType', value)}
              placeholder="All Types"
            />
          </div>

          {/* Mini Course Filter (Admin/Superadmin only, shown when quizType is mini_course) */}
          {(role === 'admin' || role === 'superadmin') && (
            <div>
              <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Mini Course
              </label>
              <AdvancedDropdown
                options={miniCourseOptions}
                value={localFilters.miniCourseId || 'all'}
                onChange={(value) => handleFilterUpdate('miniCourseId', value)}
                placeholder="All Mini Courses"
                searchable={true}
              />
            </div>
          )}

          {/* Course Filter */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Course
            </label>
            <AdvancedDropdown
              options={courseOptions}
              value={localFilters.courseId || 'all'}
              onChange={(value) => handleFilterUpdate('courseId', value)}
              placeholder="All Courses"
              searchable={true}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Status
            </label>
            <AdvancedDropdown
              options={statusOptions}
              value={localFilters.status || 'all'}
              onChange={(value) => handleFilterUpdate('status', value)}
              placeholder="All Status"
            />
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Start Date
            </label>
            <input
              type="date"
              value={localFilters.startDate || ''}
              onChange={(e) => handleFilterUpdate('startDate', e.target.value || null)}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              End Date
            </label>
            <input
              type="date"
              value={localFilters.endDate || ''}
              onChange={(e) => handleFilterUpdate('endDate', e.target.value || null)}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-whiteColor dark:bg-whiteColor-dark border-t border-borderColor dark:border-borderColor-dark p-4 space-y-2">
          <button
            onClick={handleApplyFilters}
            className="w-full px-4 py-2 bg-primaryColor text-whiteColor rounded-lg font-semibold hover:bg-primaryColor/90 transition-colors"
          >
            Apply Filters
          </button>
          <button
            onClick={handleClearFilters}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-blackColor dark:text-blackColor-dark rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
    </>
  );
};

export default ManageQuizFilterSidebar;

