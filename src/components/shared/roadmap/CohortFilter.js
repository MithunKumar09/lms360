"use client";

import { useCohortsForCourse } from "@/hooks/api/useStudentProgressComparison";

/**
 * CohortFilter Component
 * 
 * Dropdown filter for selecting cohort to filter student comparison
 */
const CohortFilter = ({ value, onChange, courseId }) => {
  const { data, isLoading } = useCohortsForCourse(courseId);
  const cohorts = data?.cohorts || [];

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-blackColor dark:text-blackColor-dark whitespace-nowrap">
        Filter by Cohort:
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={isLoading}
        className={`
          px-4 py-2
          border border-borderColor dark:border-borderColor-dark
          rounded-lg
          bg-whiteColor dark:bg-whiteColor-dark
          text-blackColor dark:text-blackColor-dark
          text-sm
          focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-primaryColor
          transition-all duration-200
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label="Filter students by cohort"
      >
        <option value="">All Cohorts</option>
        {cohorts.map((cohort) => (
          <option key={cohort.id} value={cohort.id}>
            {cohort.code || cohort.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CohortFilter;
