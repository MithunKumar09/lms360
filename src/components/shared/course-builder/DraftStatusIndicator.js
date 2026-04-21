/**
 * Draft Status Indicator
 * 
 * Displays draft save status and last saved time.
 */

'use client';

import { useCourseStore } from '@/store/index.js';
import { useEffect, useState } from 'react';

const DraftStatusIndicator = () => {
  const { isDraft, lastSaved, savingDraft, draftId } = useCourseStore();
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (!lastSaved) {
      setTimeAgo('');
      return;
    }

    const updateTimeAgo = () => {
      const now = new Date();
      const diff = now - new Date(lastSaved);
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (seconds < 60) {
        setTimeAgo('Just now');
      } else if (minutes < 60) {
        setTimeAgo(`${minutes} minute${minutes !== 1 ? 's' : ''} ago`);
      } else if (hours < 24) {
        setTimeAgo(`${hours} hour${hours !== 1 ? 's' : ''} ago`);
      } else {
        const days = Math.floor(hours / 24);
        setTimeAgo(`${days} day${days !== 1 ? 's' : ''} ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastSaved]);

  if (!isDraft && !draftId) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {savingDraft ? (
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Saving draft...</span>
        </div>
      ) : lastSaved ? (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <svg
            className="h-4 w-4"
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
          <span>Draft saved {timeAgo}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Draft not saved yet</span>
        </div>
      )}
    </div>
  );
};

export default DraftStatusIndicator;

