"use client";

import React, { useState, useCallback } from 'react';
import { FiSearch, FiFilter } from 'react-icons/fi';
import AvailableQuizzesSection from './sections/AvailableQuizzesSection';
import AttemptedQuizzesSection from './sections/AttemptedQuizzesSection';
import RecommendedMiniCoursesSection from './sections/RecommendedMiniCoursesSection';
import ReportsSection from './sections/ReportsSection';
import RemindersSection from './sections/RemindersSection';
import AdvancedDropdown from '@/components/shared/forms/AdvancedDropdown';
import IconButton from '@/components/quiz/buttons/IconButton';

const StudentMyQuizPrimary = ({ className = '' }) => {
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalFilters, setGlobalFilters] = useState({
    quizType: null,
    status: null,
  });
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);

  const handleGlobalSearch = useCallback((e) => {
    setGlobalSearch(e.target.value);
  }, []);

  const handleGlobalFilterChange = useCallback((key, value) => {
    setGlobalFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? null : value,
    }));
  }, []);

  const quizTypeOptions = [
    { id: 'all', label: 'All Types', value: 'all' },
    { id: 'main_course', label: 'Main Course', value: 'main_course' },
    { id: 'mini_course', label: 'Mini Course', value: 'mini_course' },
    { id: 'global', label: 'Global', value: 'global' },
  ];

  const statusOptions = [
    { id: 'all', label: 'All Status', value: 'all' },
    { id: 'available', label: 'Available', value: 'available' },
    { id: 'attempted', label: 'Attempted', value: 'attempted' },
    { id: 'recommended', label: 'Recommended', value: 'recommended' },
  ];

  return (
    <div className={`p-6 ${className}`}>
      {/* Section 1: Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blackColor dark:text-blackColor-dark mb-6">
          My Quizzes
        </h1>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search quizzes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor dark:bg-darkdeep1 dark:text-white"
              value={globalSearch}
              onChange={handleGlobalSearch}
            />
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <IconButton
            icon={FiFilter}
            onClick={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}
            variant="outline"
            ariaLabel="Open filters"
          />
          <AdvancedDropdown
            options={quizTypeOptions}
            value={globalFilters.quizType || 'all'}
            onChange={(value) => handleGlobalFilterChange('quizType', value)}
            placeholder="Quiz Type"
            className="w-40"
          />
          <AdvancedDropdown
            options={statusOptions}
            value={globalFilters.status || 'all'}
            onChange={(value) => handleGlobalFilterChange('status', value)}
            placeholder="Status"
            className="w-40"
          />
        </div>
      </div>

      {/* Section 2: Available Quizzes */}
      <AvailableQuizzesSection />

      {/* Section 3: Attempted Quizzes */}
      <AttemptedQuizzesSection />

      {/* Section 4: Recommended Mini Courses */}
      <RecommendedMiniCoursesSection />

      {/* Section 5: Performance Reports */}
      <ReportsSection />

      {/* Section 6: Reminders */}
      <RemindersSection />
    </div>
  );
};

export default StudentMyQuizPrimary;

