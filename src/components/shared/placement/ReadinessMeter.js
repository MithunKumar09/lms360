/**
 * Readiness Meter Component
 * 
 * Circular progress indicator showing placement readiness score
 */

'use client';

export default function ReadinessMeter({ readiness }) {
  if (!readiness) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">Readiness score not available</p>
      </div>
    );
  }

  const score = readiness.readinessScore || 0;
  const status = readiness.status || 'not_ready';
  
  // Determine color based on status
  const getColor = () => {
    if (status === 'ready') return 'text-green-600';
    if (status === 'getting_ready') return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBgColor = () => {
    if (status === 'ready') return 'bg-green-100';
    if (status === 'getting_ready') return 'bg-yellow-100';
    return 'bg-red-100';
  };

  // Calculate circle progress (0-100 maps to 0-360 degrees for SVG)
  const circumference = 2 * Math.PI * 90; // radius = 90
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col md:flex-row items-center justify-center space-y-6 md:space-y-0 md:space-x-12">
      {/* Circular Progress */}
      <div className="relative">
        <svg className="transform -rotate-90 w-48 h-48">
          {/* Background circle */}
          <circle
            cx="96"
            cy="96"
            r="90"
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx="96"
            cy="96"
            r="90"
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={getColor()}
            style={{
              transition: 'stroke-dashoffset 0.5s ease-in-out',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-4xl font-bold ${getColor()}`}>{Math.round(score)}%</div>
            <div className={`text-sm mt-1 px-3 py-1 rounded-full ${getBgColor()} ${getColor()}`}>
              {status.replace('_', ' ').toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-4 min-w-[300px]">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Score Breakdown</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">Course Completion</span>
              <span className="font-medium">{Math.round(readiness.courseCompletionRate || 0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${readiness.courseCompletionRate || 0}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">Assignment Completion</span>
              <span className="font-medium">{Math.round(readiness.assignmentCompletionRate || 0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${readiness.assignmentCompletionRate || 0}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">Profile Completion</span>
              <span className="font-medium">{Math.round(readiness.profileCompletionRate || 0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${readiness.profileCompletionRate || 0}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">Skills Assessed</span>
              <span className="font-medium">{readiness.skillsAssessedCount || 0}</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">Mentor Endorsements</span>
              <span className="font-medium">{readiness.mentorEndorsementsCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
