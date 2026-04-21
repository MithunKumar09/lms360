/**
 * Form Progress Indicator
 * 
 * Shows progress through form sections with completion status.
 */

'use client';

import { useCourseStore } from '@/store/index.js';

const FormProgressIndicator = () => {
  const { courseData, currentSection } = useCourseStore();

  const sections = [
    { id: 'info', label: 'Basic Info', required: ['title', 'slug'] },
    { id: 'selections', label: 'Selections', required: ['categoryId'] },
    { id: 'video', label: 'Video', required: ['introVideoUrl'] },
    { id: 'builder', label: 'Course Builder', required: ['modules'] },
    { 
      id: 'additional', 
      label: 'Additional Info', 
      required: [], 
      optional: ['startDate', 'language', 'requirements', 'description', 'tags'] 
    },
  ];

  const getSectionCompletion = (section) => {
    // Handle sections with optional fields (like Additional Info)
    if (section.optional && section.optional.length > 0) {
      const completed = section.optional.filter((field) => {
        const value = courseData[field];
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        return value !== null && value !== undefined && value !== '';
      }).length;
      
      // If at least one optional field is filled, consider it complete
      // Or show partial completion based on filled fields
      if (completed > 0) {
        return 100; // Mark as complete if any field is filled
      }
      return 0;
    }

    // Handle sections with required fields
    if (!section.required || section.required.length === 0) {
      return courseData[section.id] ? 100 : 0;
    }

    const completed = section.required.filter((field) => {
      const value = courseData[field];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== null && value !== undefined && value !== '';
    }).length;

    return (completed / section.required.length) * 100;
  };

  const overallProgress = sections.reduce((acc, section) => {
    return acc + getSectionCompletion(section);
  }, 0) / sections.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Form Progress
          </h3>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {Math.round(overallProgress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
      </div>

      <div className="space-y-2">
        {sections.map((section) => {
          const completion = getSectionCompletion(section);
          const isActive = currentSection === section.id;
          const isComplete = completion === 100;

          return (
            <div
              key={section.id}
              className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex-shrink-0">
                {isComplete ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                    {completion > 0 && (
                      <div
                        className="w-3 h-3 rounded-full bg-blue-500"
                        style={{ opacity: completion / 100 }}
                      ></div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    isActive
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {section.label}
                </p>
                {completion > 0 && completion < 100 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {Math.round(completion)}% complete
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FormProgressIndicator;

