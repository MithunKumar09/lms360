//src/components/shared/roadmap/StudentProgressTable.js
"use client";

import { useState, useMemo, memo } from "react";
import Image from "next/image";
import { useStudentProgressComparison } from "@/hooks/api/useStudentProgressComparison";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import NoData from "@/components/shared/others/NoData";
import CohortFilter from "./CohortFilter";
import { useAuthStore } from "@/store/index.js";

/**
 * StudentProgressTable Component
 * 
 * Displays a table comparing student progress for a specific course.
 * Features:
 * - Student name, avatar, cohort
 * - Progress percentage with visual bar
 * - Milestone completion count
 * - Rank/position indicator
 * - Cohort filtering
 * - Read-only view
 */
const StudentProgressTable = ({ courseId, currentStudentId }) => {
  const [selectedCohortId, setSelectedCohortId] = useState(null);
  const [sortBy, setSortBy] = useState('progress'); // 'progress', 'milestones', 'name'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'

  // Fetch student comparison data
  const {
    data: comparisonData,
    isLoading,
    error,
    refetch,
  } = useStudentProgressComparison(courseId, selectedCohortId);

  // Process and sort students
  const processedStudents = useMemo(() => {
    if (!comparisonData?.students) return [];

    let students = [...comparisonData.students];

    // Sort students
    students.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'progress':
          aValue = a.progress || 0;
          bValue = b.progress || 0;
          break;
        case 'milestones':
          aValue = a.completedMilestones || 0;
          bValue = b.completedMilestones || 0;
          break;
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    // Add rank to each student
    return students.map((student, index) => ({
      ...student,
      rank: index + 1,
      isCurrentStudent: student.id === currentStudentId,
    }));
  }, [comparisonData, sortBy, sortOrder, currentStudentId]);

  // Get current student rank
  const currentStudentRank = useMemo(() => {
    const current = processedStudents.find(s => s.isCurrentStudent);
    return current?.rank || comparisonData?.summary?.currentStudentRank || null;
  }, [processedStudents, comparisonData]);

  // Handle sort
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Get sort icon
  const getSortIcon = (column) => {
    if (sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-primaryColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-primaryColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Student Progress Comparison
          </h2>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <SkeletonLoader key={idx} type="text" className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="text-center py-10">
          <p className="text-red-500">{error?.message || 'Failed to load student progress'}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-primaryColor text-white rounded hover:bg-primaryColor-dark"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!processedStudents || processedStudents.length === 0) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Student Progress Comparison
          </h2>
        </div>
        <NoData message="No other students enrolled in this course yet." />
      </div>
    );
  }

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      {/* Header */}
      <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
              Student Progress Comparison
            </h2>
            <p className="text-sm text-contentColor dark:text-contentColor-dark mt-1">
              See how your progress compares with other students
              {currentStudentRank && (
                <span className="ml-2 font-semibold text-primaryColor">
                  (You&apos;re ranked #{currentStudentRank})
                </span>
              )}
            </p>
          </div>

          {/* Cohort Filter */}
          <CohortFilter
            value={selectedCohortId}
            onChange={setSelectedCohortId}
            courseId={courseId}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-borderColor dark:border-borderColor-dark">
              {/* Rank Column */}
              <th className="py-3 px-4 text-left text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Rank
              </th>

              {/* Student Column */}
              <th className="py-3 px-4 text-left text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Student
              </th>

              {/* Cohort Column */}
              <th className="py-3 px-4 text-left text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Cohort
              </th>

              {/* Progress Column (Sortable) */}
              <th
                className="py-3 px-4 text-left text-sm font-semibold text-blackColor dark:text-blackColor-dark cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('progress')}
              >
                <div className="flex items-center gap-2">
                  Progress
                  {getSortIcon('progress')}
                </div>
              </th>

              {/* Milestones Column (Sortable) */}
              <th
                className="py-3 px-4 text-left text-sm font-semibold text-blackColor dark:text-blackColor-dark cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('milestones')}
              >
                <div className="flex items-center gap-2">
                  Milestones
                  {getSortIcon('milestones')}
                </div>
              </th>

              {/* Stamps Column */}
              <th className="py-3 px-4 text-left text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                Stamps
              </th>
            </tr>
          </thead>
          <tbody>
            {processedStudents.map((student) => (
              <StudentRow
                key={student.id}
                student={student}
                isCurrentStudent={student.isCurrentStudent}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      {comparisonData?.summary && (
        <div className="mt-6 pt-6 border-t border-borderColor dark:border-borderColor-dark">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primaryColor">
                {comparisonData.summary.totalStudents}
              </div>
              <div className="text-sm text-contentColor dark:text-contentColor-dark">
                Total Students
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {comparisonData.summary.averageProgress?.toFixed(1)}%
              </div>
              <div className="text-sm text-contentColor dark:text-contentColor-dark">
                Average Progress
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {comparisonData.summary.averageMilestones?.toFixed(1)}
              </div>
              <div className="text-sm text-contentColor dark:text-contentColor-dark">
                Avg. Milestones
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * StudentRow Component
 * 
 * Individual row in the student progress table
 */
const StudentRow = memo(({ student, isCurrentStudent }) => {
  const {
    id,
    name,
    email,
    avatarUrl,
    cohortCode,
    progress = 0,
    completedMilestones = 0,
    totalMilestones = 4,
    stampCount = 0,
    rank,
  } = student;

  // Get rank badge color
  const getRankBadgeColor = () => {
    if (rank === 1) return 'bg-yellow-500 text-white';
    if (rank === 2) return 'bg-gray-400 text-white';
    if (rank === 3) return 'bg-orange-600 text-white';
    return 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300';
  };

  // Get rank icon
  const getRankIcon = () => {
    if (rank === 1) {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
    return null;
  };

  return (
    <tr
      className={`
        border-b border-borderColor dark:border-borderColor-dark
        transition-colors
        ${isCurrentStudent 
          ? 'bg-primaryColor/5 dark:bg-primaryColor/10 font-semibold' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }
      `}
    >
      {/* Rank */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <span
            className={`
              w-8 h-8 rounded-full
              flex items-center justify-center
              text-sm font-bold
              ${getRankBadgeColor()}
            `}
          >
            {getRankIcon() || rank}
          </span>
        </div>
      </td>

      {/* Student Info */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={name}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          {/* Name & Email */}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-blackColor dark:text-blackColor-dark truncate">
              {name}
              {isCurrentStudent && (
                <span className="ml-2 text-xs text-primaryColor">(You)</span>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {email}
            </div>
          </div>
        </div>
      </td>

      {/* Cohort */}
      <td className="py-4 px-4">
        <span className="text-sm text-contentColor dark:text-contentColor-dark">
          {cohortCode || 'N/A'}
        </span>
      </td>

      {/* Progress */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          {/* Progress Bar */}
          <div className="flex-1 min-w-[100px]">
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`
                  h-full rounded-full transition-all duration-500
                  ${progress >= 100 
                    ? 'bg-gradient-to-r from-green-500 to-green-600' 
                    : progress >= 75
                    ? 'bg-gradient-to-r from-blue-500 to-green-500'
                    : progress >= 50
                    ? 'bg-gradient-to-r from-yellow-500 to-blue-500'
                    : 'bg-gradient-to-r from-gray-400 to-yellow-500'
                  }
                `}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          {/* Percentage */}
          <span className="text-sm font-semibold text-blackColor dark:text-blackColor-dark min-w-[50px] text-right">
            {Math.round(progress)}%
          </span>
        </div>
      </td>

      {/* Milestones */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            {completedMilestones} / {totalMilestones}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: totalMilestones }).map((_, idx) => (
              <div
                key={idx}
                className={`
                  w-3 h-3 rounded-full
                  ${idx < completedMilestones 
                    ? 'bg-yellow-400' 
                    : 'bg-gray-300 dark:bg-gray-600'
                  }
                `}
              />
            ))}
          </div>
        </div>
      </td>

      {/* Stamps */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-1">
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            {stampCount}
          </span>
        </div>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  // Memoize based on student data
  return (
    prevProps.student.id === nextProps.student.id &&
    prevProps.student.progress === nextProps.student.progress &&
    prevProps.student.completedMilestones === nextProps.student.completedMilestones &&
    prevProps.isCurrentStudent === nextProps.isCurrentStudent
  );
});

StudentRow.displayName = 'StudentRow';

export default StudentProgressTable;
