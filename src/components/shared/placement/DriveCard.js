/**
 * Drive Card Component
 * 
 * Displays a recruitment drive card
 */

'use client';

import { useState } from 'react';

export default function DriveCard({ drive, onRegister, isRegistering }) {
  const [showDetails, setShowDetails] = useState(false);
  const driveDate = new Date(drive.driveDate);
  const isPast = driveDate < new Date();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{drive.title}</h3>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-1">{drive.companyName}</p>
        </div>
        <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
          {drive.status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mr-2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          {driveDate.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </div>
        {drive.location && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="mr-2"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            {drive.isVirtual ? 'Virtual' : drive.location}
          </div>
        )}
        {drive.maxParticipants && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="mr-2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            {drive.registeredCount || 0} / {drive.maxParticipants} registered
          </div>
        )}
      </div>

      {drive.description && (
        <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{drive.description}</p>
      )}

      <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-gray-700">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          {showDetails ? 'Hide Details' : 'View Details'}
        </button>
        {!isPast && (
          <button
            onClick={() => onRegister && onRegister(drive.id)}
            disabled={isRegistering}
            className="px-4 py-2 bg-primaryColor text-whiteColor rounded-lg hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRegistering ? 'Registering...' : 'Register'}
          </button>
        )}
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-2">
          {drive.eligibilityCriteria && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Eligibility Criteria:</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-line">{drive.eligibilityCriteria}</p>
            </div>
          )}
          {drive.venueAddress && !drive.isVirtual && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Venue:</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{drive.venueAddress}</p>
            </div>
          )}
          {drive.virtualLink && drive.isVirtual && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Virtual Link:</h4>
              <a
                href={drive.virtualLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                {drive.virtualLink}
              </a>
            </div>
          )}
          {drive.registrationDeadline && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Registration Deadline: {new Date(drive.registrationDeadline).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
