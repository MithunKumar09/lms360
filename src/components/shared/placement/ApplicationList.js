/**
 * Application List Component
 * 
 * Displays a list of applications
 */

'use client';

import Link from 'next/link';

export default function ApplicationList({ applications = [], title = 'Applications' }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'shortlisted':
        return 'bg-blue-100 text-blue-800';
      case 'reviewing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>
      {applications.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No applications yet</p>
      ) : (
        <div className="space-y-3">
          {applications.map((application) => (
            <Link
              key={application.id}
              href={`/dashboards/student-placement/applications/${application.id}`}
              className="block border-b dark:border-gray-700 pb-3 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{application.postingTitle}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{application.companyName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(application.appliedAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${getStatusColor(application.applicationStatus)}`}
                >
                  {application.applicationStatus}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
