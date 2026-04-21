"use client";

import { useState } from "react";
import { useParentStudentActivity } from "@/hooks/api/useParent";
import ParentStudentSelector from "./ParentStudentSelector";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import NoData from "@/components/shared/others/NoData";
import useTab from "@/hooks/useTab";
import TabContentWrapper from "@/components/shared/wrappers/TabContentWrapper";
import TabButtonSecondary from "@/components/shared/buttons/TabButtonSecondary";

/**
 * ParentActivityTracker Component
 * 
 * Displays activity & engagement tracking:
 * - Daily activity log
 * - Weekly engagement summary
 * - Streak maintenance display
 * - Time spent on platform
 * - Active days count
 * - Inactivity alerts
 */
const ParentActivityTracker = () => {
  const { currentIdx, handleTabClick } = useTab();
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [timeRange, setTimeRange] = useState("week"); // week, month, all

  const { data, isLoading, error } = useParentStudentActivity({
    studentId: selectedStudentId,
    timeRange,
  });

  // Show student selector if no student selected
  if (!selectedStudentId) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Activity & Engagement Tracker
          </h2>
        </div>
        <div className="mb-6">
          <ParentStudentSelector
            value={selectedStudentId}
            onChange={setSelectedStudentId}
            showLabel={true}
          />
        </div>
        <div className="text-center py-10">
          <p className="text-contentColor dark:text-contentColor-dark">
            Please select a child to view their activity and engagement data.
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
              Activity & Engagement Tracker
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
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
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
              Activity & Engagement Tracker
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
          <p className="text-red-500">{error?.message || 'Failed to load activity data'}</p>
        </div>
      </div>
    );
  }

  const activity = data?.activity || {};
  const engagement = data?.engagement || {};

  // Format time spent
  const formatTimeSpent = (seconds) => {
    if (!seconds) return "0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const tabButtons = [
    {
      name: "DAILY ACTIVITY",
      content: (
        <div className="space-y-4">
          {activity.dailyLog && activity.dailyLog.length > 0 ? (
            activity.dailyLog.map((day, idx) => (
              <div
                key={idx}
                className="p-4 bg-lightGrey5 dark:bg-whiteColor-dark rounded-lg2 shadow-accordion-dark transition-shadow hover:shadow-lg"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-blackColor dark:text-blackColor-dark">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-contentColor dark:text-contentColor-dark mt-1">
                      {day.activitiesCount || 0} activities • {formatTimeSpent(day.timeSpent)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      day.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                      {day.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <NoData message="No daily activity data available." />
          )}
        </div>
      ),
    },
    {
      name: "ENGAGEMENT SUMMARY",
      content: (
        <div className="space-y-6">
          {/* Engagement Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-15px lg:gap-30px">
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg transition-shadow hover:shadow-lg">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                Current Streak
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {engagement.currentStreak || 0} days
              </p>
            </div>
            <div className="p-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg transition-shadow hover:shadow-lg">
              <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                Time Spent
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatTimeSpent(engagement.totalTimeSpent)}
              </p>
            </div>
            <div className="p-6 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg transition-shadow hover:shadow-lg">
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
                Active Days
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {engagement.activeDaysCount || 0}
              </p>
            </div>
            <div className="p-6 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg transition-shadow hover:shadow-lg">
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">
                Weekly Activities
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {engagement.weeklyActivityCount || 0}
              </p>
            </div>
          </div>

          {/* Inactivity Alert */}
          {engagement.daysSinceLastActivity > 3 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold text-yellow-800 dark:text-yellow-400">
                    Inactivity Alert
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-500">
                    Last activity was {engagement.daysSinceLastActivity} days ago.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Weekly Summary */}
          {engagement.weeklySummary && (
            <div className="p-4 bg-lightGrey5 dark:bg-whiteColor-dark rounded-lg2 shadow-accordion-dark">
              <h3 className="font-semibold text-blackColor dark:text-blackColor-dark mb-3">
                Weekly Summary
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-contentColor dark:text-contentColor-dark">
                  Activities this week: {engagement.weeklySummary.activitiesCount || 0}
                </p>
                <p className="text-sm text-contentColor dark:text-contentColor-dark">
                  Time spent: {formatTimeSpent(engagement.weeklySummary.timeSpent)}
                </p>
                <p className="text-sm text-contentColor dark:text-contentColor-dark">
                  Average per day: {formatTimeSpent(engagement.weeklySummary.averageTimePerDay)}
                </p>
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Activity & Engagement Tracker
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="w-full md:w-64 flex-shrink-0">
              <ParentStudentSelector
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                showLabel={false}
                placeholder="Select child..."
              />
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark w-full md:w-auto"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      <div className="tab">
        <div className="tab-links flex flex-wrap mb-10px lg:mb-50px rounded gap-10px justify-center">
          {tabButtons?.map(({ name }, idx) => (
            <TabButtonSecondary
              key={idx}
              name={name}
              idx={idx}
              currentIdx={currentIdx}
              handleTabClick={handleTabClick}
              button={"small"}
            />
          ))}
        </div>
        <div>
          {tabButtons?.map(({ content }, idx) => (
            <TabContentWrapper
              key={idx}
              isShow={idx === currentIdx ? true : false}
            >
              {content}
            </TabContentWrapper>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParentActivityTracker;
