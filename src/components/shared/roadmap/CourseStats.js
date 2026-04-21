"use client";

/**
 * CourseStats Component
 * 
 * Displays course statistics in a clean, organized format:
 * - Milestones completed/total (separate row)
 * - Stamp count (separate row)
 * - Clean icon + number + label layout
 * - Consistent spacing and hover effects
 * - Each stat in its own row (vertical layout)
 */
const CourseStats = ({ completedMilestones = 0, totalMilestones = 4, stampCount = 0 }) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Milestones Stat - Row 1 */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
              {completedMilestones} / {totalMilestones}
            </div>
            <div className="text-xs text-contentColor dark:text-contentColor-dark">
              Milestones
            </div>
          </div>
        </div>
      </div>

      {/* Stamps Stat - Row 2 */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
              {stampCount}
            </div>
            <div className="text-xs text-contentColor dark:text-contentColor-dark">
              Stamps
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseStats;
