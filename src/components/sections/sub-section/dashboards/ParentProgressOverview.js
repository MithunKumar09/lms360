"use client";

import { useState, useEffect } from "react";
import { useParentStudentProgress } from "@/hooks/api/useParent";
import ParentStudentSelector from "./ParentStudentSelector";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import NoData from "@/components/shared/others/NoData";

/**
 * ParentProgressOverview Component
 * 
 * Displays student progress overview cards:
 * - Course enrollment display
 * - Completion percentage tracking
 * - Attendance summary
 * - Overall performance grade
 * - Readiness meter view
 * - Milestone achievement tracking
 */
const ParentProgressOverview = () => {
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const { data, isLoading, error } = useParentStudentProgress({
    studentId: selectedStudentId,
  });

  // Show student selector if no student selected
  if (!selectedStudentId) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Student Progress Overview
          </h2>
        </div>
        <div className="mb-6 max-w-md">
          <ParentStudentSelector
            value={selectedStudentId}
            onChange={setSelectedStudentId}
            showLabel={true}
          />
        </div>
        <div className="text-center py-10">
          <p className="text-contentColor dark:text-contentColor-dark">
            Please select a child to view their progress overview.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
              Student Progress Overview
            </h2>
            <div className="w-64">
              <ParentStudentSelector
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                showLabel={false}
                placeholder="Select child..."
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="bg-lightGrey5 dark:bg-whiteColor-dark rounded-lg2 shadow-accordion-dark p-6">
              <SkeletonLoader count={3} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
              Student Progress Overview
            </h2>
            <div className="w-64">
              <ParentStudentSelector
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                showLabel={false}
                placeholder="Select child..."
              />
            </div>
          </div>
        </div>
        <div className="text-center py-10">
          <p className="text-red-500">{error?.message || 'Failed to load progress data'}</p>
        </div>
      </div>
    );
  }

  const progress = data?.progress;
  if (!progress) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
              Student Progress Overview
            </h2>
            <div className="w-64">
              <ParentStudentSelector
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                showLabel={false}
                placeholder="Select child..."
              />
            </div>
          </div>
        </div>
        <NoData message="No progress data available for this child." />
      </div>
    );
  }

  // Progress cards data
  const progressCards = [
    {
      title: "Course Enrollment",
      value: progress.totalEnrollments || 0,
      subtitle: "Total courses enrolled",
      icon: "📚",
      color: "blue",
    },
    {
      title: "Completion Percentage",
      value: `${Math.round(progress.averageCompletion || 0)}%`,
      subtitle: "Average course completion",
      icon: "✅",
      color: "green",
    },
    {
      title: "Attendance",
      value: `${Math.round(progress.attendancePercentage || 0)}%`,
      subtitle: "Overall attendance rate",
      icon: "📅",
      color: "purple",
    },
    {
      title: "Performance Grade",
      value: progress.overallGrade || "N/A",
      subtitle: "Overall performance",
      icon: "⭐",
      color: "yellow",
    },
    {
      title: "Readiness Meter",
      value: `${Math.round(progress.readinessScore || 0)}%`,
      subtitle: "Course readiness score",
      icon: "🎯",
      color: "orange",
    },
    {
      title: "Milestones Achieved",
      value: progress.milestonesCompleted || 0,
      subtitle: "Total milestones completed",
      icon: "🏆",
      color: "red",
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400",
      green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400",
      purple: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400",
      yellow: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400",
      orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400",
      red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400",
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Student Progress Overview
          </h2>
          <div className="w-full md:w-64 flex-shrink-0">
            <ParentStudentSelector
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              showLabel={false}
              placeholder="Select child..."
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-15px lg:gap-30px">
        {progressCards.map((card, idx) => (
          <div
            key={idx}
            className={`p-6 rounded-lg border-2 transition-shadow hover:shadow-lg ${getColorClasses(card.color)}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium opacity-80 mb-1">{card.title}</p>
                <h3 className="text-3xl font-bold break-words">{card.value}</h3>
                <p className="text-xs mt-2 opacity-70">{card.subtitle}</p>
              </div>
              <div className="text-4xl flex-shrink-0 ml-4">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParentProgressOverview;
