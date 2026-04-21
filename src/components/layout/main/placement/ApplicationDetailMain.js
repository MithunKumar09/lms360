/**
 * Application Detail Main Component
 * 
 * Displays full application details with option to withdraw
 */

'use client';

import { useRouter } from 'next/navigation';
import { useApplication, useWithdrawApplication } from '@/hooks/api/usePlacement.js';
import Link from 'next/link';

export default function ApplicationDetailMain({ applicationId }) {
  const router = useRouter();
  const { data: application, isLoading, error } = useApplication(applicationId);
  const withdrawApplication = useWithdrawApplication();

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
      case 'interview_scheduled':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
      return;
    }

    try {
      await withdrawApplication.mutateAsync(applicationId);
      router.push('/dashboards/student-placement');
    } catch (error) {
      alert(error.message || 'Failed to withdraw application');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-600">{error?.message || 'Application not found'}</p>
          <Link
            href="/dashboards/student-placement"
            className="mt-4 inline-block text-blue-600 hover:text-blue-700"
          >
            ← Back to Placement Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboards/student-placement"
            className="text-blue-600 hover:text-blue-700 mb-2 inline-block"
          >
            ← Back to Placement Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Application Details</h1>
        </div>
        {application.applicationStatus === 'pending' || application.applicationStatus === 'reviewing' ? (
          <button
            onClick={handleWithdraw}
            disabled={withdrawApplication.isPending}
            className="px-4 py-2 bg-secondaryColor3 text-whiteColor rounded-lg hover:bg-secondaryColor3/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {withdrawApplication.isPending ? 'Withdrawing...' : 'Withdraw Application'}
          </button>
        ) : null}
      </div>

      {/* Application Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Application Status</h2>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(application.applicationStatus)}`}>
            {application.applicationStatus.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Applied on:</span>
            <span className="ml-2 font-medium">
              {new Date(application.appliedAt).toLocaleDateString()}
            </span>
          </div>
          {application.reviewedAt && (
            <div>
              <span className="text-gray-600 dark:text-gray-400">Reviewed on:</span>
              <span className="ml-2 font-medium">
                {new Date(application.reviewedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Posting Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Position Details</h2>
        <div className="space-y-3">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Position:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{application.postingTitle}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Company:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{application.companyName}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Type:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100 capitalize">{application.postingType}</span>
          </div>
          {application.location && (
            <div>
              <span className="text-gray-600 dark:text-gray-400">Location:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{application.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Cover Letter */}
      {application.coverLetter && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Cover Letter</h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{application.coverLetter}</p>
          </div>
        </div>
      )}

      {/* Notes */}
      {application.notes && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Your Notes</h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{application.notes}</p>
        </div>
      )}

      {/* Admin Notes (if available) */}
      {application.adminNotes && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Admin Notes</h2>
          <p className="text-blue-800 whitespace-pre-line">{application.adminNotes}</p>
        </div>
      )}

      {/* Expected Salary */}
      {application.expectedSalary && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Expected Salary</h2>
          <p className="text-gray-700 dark:text-gray-300">₹{application.expectedSalary.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
