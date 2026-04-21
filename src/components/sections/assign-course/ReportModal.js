/**
 * Report Modal Component
 * 
 * Modal for displaying assignment report.
 * Shows table with assigned data and export options.
 */

'use client';

import { useAuthStore } from '@/store/index.js';
import useAssignCourseStore from '@/store/assignCourseStore.js';
import { useAssignmentReport } from '@/hooks/api/useAssignmentReport.js';
import ReportTable from './ReportTable.js';

const ReportModal = () => {
  const user = useAuthStore((state) => state.user);
  const isOpen = useAssignCourseStore((state) => state.isReportModalOpen);
  const closeModal = useAssignCourseStore((state) => state.closeReportModal);

  // Fetch report data
  const {
    data: reportData,
    isLoading,
    isError,
    error,
    refetch,
  } = useAssignmentReport({}, {
    enabled: isOpen,
  });

  const assignments = reportData?.assignments || [];
  const summary = reportData?.summary || {};

  const handleExport = (format) => {
    if (!user?.role) return;

    const params = new URLSearchParams({
      format,
      role: user.role,
    });

    // Open export URL in new window
    const exportUrl = `/api/courses/assignments/export?${params.toString()}`;
    window.open(exportUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 transition-opacity"
      style={{
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' : 'hidden',
      }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={closeModal}
        aria-label="Close modal"
      />

      {/* Modal Content */}
      <div
        className="relative z-10 w-full max-w-7xl max-h-[90vh] mx-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-xl overflow-hidden flex flex-col animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-borderColor dark:border-borderColor-dark flex justify-between items-center">
          <div>
            <h2 id="report-modal-title" className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
              Courses Assigned Report
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              View and export course assignment data
            </p>
          </div>
          <button
            onClick={closeModal}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primaryColor"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Loading report...
              </p>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400 mb-4">
                {error?.message || 'Failed to load report'}
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-primaryColor text-whiteColor rounded hover:bg-primaryColor/90 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-borderColor dark:border-borderColor-dark">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Total Assignments
                    </div>
                    <div className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
                      {summary.totalAssignments || 0}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-borderColor dark:border-borderColor-dark">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Main Assignments
                    </div>
                    <div className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
                      {summary.mainAssignments || 0}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-borderColor dark:border-borderColor-dark">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Assigned Courses
                    </div>
                    <div className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
                      {summary.assignedCourses || 0}
                    </div>
                  </div>
                </div>
              )}

              {/* Report Table */}
              <ReportTable data={assignments} onExport={handleExport} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-borderColor dark:border-borderColor-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {assignments.length} total assignment{assignments.length !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 border border-borderColor dark:border-borderColor-dark rounded hover:bg-whiteColor dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 border border-borderColor dark:border-borderColor-dark rounded hover:bg-whiteColor dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Export PDF
            </button>
            <button
              onClick={closeModal}
              className="px-4 py-2 bg-primaryColor text-whiteColor rounded hover:bg-primaryColor/90 transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;

