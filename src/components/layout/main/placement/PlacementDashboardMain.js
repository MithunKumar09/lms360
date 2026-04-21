/**
 * Placement Dashboard Main Component
 * 
 * Displays readiness meter, quick actions, recent applications, and upcoming drives
 */

'use client';

import { usePlacementReadiness, useApplications, useDrives } from '@/hooks/api/usePlacement.js';
import ReadinessMeter from '@/components/shared/placement/ReadinessMeter.js';
import ApplicationCardSkeleton from '@/components/shared/placement/ApplicationCardSkeleton.js';
import Link from 'next/link';

export default function PlacementDashboardMain() {
  const { data: readiness, isLoading: readinessLoading } = usePlacementReadiness();
  const { data: applicationsData, isLoading: applicationsLoading } = useApplications({ page: 1, pageSize: 5 });
  const { data: drivesData, isLoading: drivesLoading } = useDrives({ page: 1, pageSize: 3 });

  // API returns { success: true, data: [...], pagination: {...} }
  const recentApplications = applicationsData?.data || [];
  const upcomingDrives = drivesData?.data || [];

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Placement & Career Readiness</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Track your readiness and explore opportunities</p>
      </div>

      {/* Readiness Meter Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Placement Readiness</h2>
        {readinessLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <ReadinessMeter readiness={readiness} />
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/dashboards/student-placement/resume"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-blue-600"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Build Resume</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Create or update your resume</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboards/student-placement/portfolio"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-green-600"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Create Portfolio</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Showcase your projects</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboards/student-placement/internships"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-purple-600"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">View Jobs</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Browse opportunities</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Applications and Upcoming Drives */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Applications</h2>
            <Link
              href="/dashboards/student-placement/internships"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          {applicationsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <ApplicationCardSkeleton key={i} />
              ))}
            </div>
          ) : recentApplications.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No applications yet</p>
          ) : (
            <div className="space-y-3">
              {recentApplications.map((application) => (
                <div key={application.id} className="border-b dark:border-gray-700 pb-3 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{application.postingTitle}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{application.companyName}</p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        application.applicationStatus === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : application.applicationStatus === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {application.applicationStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Drives */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Upcoming Drives</h2>
            <Link
              href="/dashboards/student-placement/drives"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          {drivesLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : upcomingDrives.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No upcoming drives</p>
          ) : (
            <div className="space-y-3">
              {upcomingDrives.map((drive) => (
                <div key={drive.id} className="border-b dark:border-gray-700 pb-3 last:border-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{drive.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{drive.companyName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(drive.driveDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
