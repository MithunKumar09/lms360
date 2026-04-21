/**
 * Posting Card Component
 * 
 * Displays a job/internship posting card
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PostingCard({ posting, onApply, isApplying }) {
  const [showDetails, setShowDetails] = useState(false);
  const hasApplied = posting.hasApplied || false;
  const applicationStatus = posting.applicationStatus;
  const externalApplicationLink = posting.applicationLink || null;
  const isEligible = posting.eligibility?.eligible !== false;

  const handleApply = () => {
    if (onApply && !hasApplied) {
      onApply(posting.id, null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{posting.title}</h3>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-1">{posting.companyName}</p>
          {posting.location && (
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="mr-1"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              {posting.location}
            </p>
          )}
        </div>
        <span
          className={`px-3 py-1 text-xs rounded-full ${
            posting.postingType === 'internship'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {posting.postingType}
        </span>
      </div>

      {posting.description && (
        <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{posting.description}</p>
      )}

      {posting.salaryDisplay && (
        <p className="text-gray-700 dark:text-gray-300 font-medium mb-4">{posting.salaryDisplay}</p>
      )}

      {posting.requiredSkills && posting.requiredSkills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {posting.requiredSkills.slice(0, 5).map((skill, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
            >
              {skill}
            </span>
          ))}
          {posting.requiredSkills.length > 5 && (
            <span className="px-2 py-1 text-gray-500 dark:text-gray-400 text-xs">+{posting.requiredSkills.length - 5} more</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-gray-700">
        <div className="flex space-x-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {showDetails ? 'Hide Details' : 'View Details'}
          </button>
          <Link
            href={`/dashboards/student-placement/${posting.postingType === 'internship' ? 'internships' : 'jobs'}/${posting.id}`}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Full Details
          </Link>
        </div>
        {hasApplied ? (
          <span
            className={`px-3 py-1 text-xs rounded-full ${
              applicationStatus === 'accepted'
                ? 'bg-green-100 text-green-800'
                : applicationStatus === 'rejected'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {applicationStatus || 'Applied'}
          </span>
        ) : externalApplicationLink ? (
          <a
            href={externalApplicationLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!isEligible}
            onClick={(e) => {
              if (!isEligible) e.preventDefault();
            }}
            className={`px-4 py-2 bg-primaryColor text-whiteColor rounded-lg hover:bg-primaryColor/90 ${
              !isEligible ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
            }`}
          >
            Apply on External Site
          </a>
        ) : (
          <button
            onClick={handleApply}
            disabled={isApplying || !isEligible}
            className="px-4 py-2 bg-primaryColor text-whiteColor rounded-lg hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApplying ? 'Applying...' : 'Apply Now'}
          </button>
        )}
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-2">
          {posting.requirements && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Requirements:</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-line">{posting.requirements}</p>
            </div>
          )}
          {posting.responsibilities && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Responsibilities:</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-line">{posting.responsibilities}</p>
            </div>
          )}
          {posting.applicationDeadline && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Deadline: {new Date(posting.applicationDeadline).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {posting.eligibility && !posting.eligibility.eligible && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-300">{posting.eligibility.reason}</p>
        </div>
      )}
    </div>
  );
}
