/**
 * Recruitment Drives Main Component
 */

'use client';

import { useState } from 'react';
import { useDrives, useRegisterForDrive } from '@/hooks/api/usePlacement.js';
import DriveCard from '@/components/shared/placement/DriveCard.js';

export default function RecruitmentDrivesMain() {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: drivesData, isLoading: drivesLoading } = useDrives({
    status: 'upcoming',
    page,
    pageSize
  });

  const registerForDrive = useRegisterForDrive();

  // API returns { success: true, data: [...], pagination: {...} }
  const drives = drivesData?.data || [];

  const handleRegister = async (driveId) => {
    try {
      await registerForDrive.mutateAsync(driveId);
    } catch (error) {
      console.error('Error registering:', error);
      alert(error.message || 'Failed to register for drive');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Recruitment Drives</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Register for upcoming campus recruitment drives</p>
      </div>

      {drivesLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : drives.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No upcoming drives</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drives.map((drive) => (
              <DriveCard
                key={drive.id}
                drive={drive}
                onRegister={handleRegister}
                isRegistering={registerForDrive.isPending}
              />
            ))}
          </div>

          {/* Pagination */}
          {drivesData?.pagination && drivesData.pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {page} of {drivesData.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(drivesData.pagination.totalPages, p + 1))}
                disabled={page === drivesData.pagination.totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
