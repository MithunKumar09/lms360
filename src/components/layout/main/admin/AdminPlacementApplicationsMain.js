/**
 * Admin Placement Applications Main Component
 * 
 * Full functionality for managing student applications
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function AdminPlacementApplicationsMain() {
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    postingType: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch applications
  const { data: applicationsData, isLoading } = useQuery({
    queryKey: ['admin-applications', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.postingType) params.append('postingType', filters.postingType);
      if (filters.search) params.append('search', filters.search);
      params.append('page', page);
      params.append('pageSize', pageSize);

      const response = await fetch(`/api/admin/placement/applications?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch applications');
      }
      return response.json();
    }
  });

  // Update application status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, adminNotes }) => {
      const response = await fetch(`/api/admin/placement/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update application');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] });
      setSelectedApplication(null);
      alert('Application status updated successfully');
    }
  });

  const applications = applicationsData?.data || [];
  const pagination = applicationsData?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleExportCSV = () => {
    const headers = [
      'Application ID',
      'Student Name',
      'Student Email',
      'Posting Title',
      'Company',
      'Type',
      'Status',
      'Applied Date',
      'Reviewed Date',
      'Expected Salary'
    ];

    const rows = applications.map(app => [
      app.id,
      app.applicantName || 'N/A',
      app.applicantEmail || 'N/A',
      app.postingTitle || 'N/A',
      app.companyName || 'N/A',
      app.postingType || 'N/A',
      app.applicationStatus || 'N/A',
      app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'N/A',
      app.reviewedAt ? new Date(app.reviewedAt).toLocaleDateString() : 'N/A',
      app.expectedSalary || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `applications_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Applications</h1>
            <p className="text-gray-600 mt-2">View and manage student applications</p>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={applications.length === 0}
            className="px-4 py-2 bg-green-600 text-whiteColor rounded-lg hover:bg-green-600/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search by student name or posting..."
            value={filters.search}
            onChange={(e) => {
              setFilters({ ...filters, search: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewing">Reviewing</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview_scheduled">Interview Scheduled</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
          <select
            value={filters.postingType}
            onChange={(e) => {
              setFilters({ ...filters, postingType: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="internship">Internship</option>
            <option value="job">Job</option>
          </select>
          <button
            onClick={() => {
              setFilters({ status: '', postingType: '', search: '' });
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Applications ({pagination.total})</h2>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : applications.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No applications found</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Posting
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applied Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((application) => (
                    <ApplicationRow
                      key={application.id}
                      application={application}
                      onView={() => setSelectedApplication(application)}
                      onStatusUpdate={(status, adminNotes) => {
                        updateStatus.mutateAsync({
                          id: application.id,
                          status,
                          adminNotes
                        });
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onStatusUpdate={(status, adminNotes) => {
            updateStatus.mutateAsync({
              id: selectedApplication.id,
              status,
              adminNotes
            });
          }}
          isUpdating={updateStatus.isPending}
        />
      )}
    </div>
  );
}

// Application Row Component
function ApplicationRow({ application, onView, onStatusUpdate }) {
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
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">{application.applicantName || 'N/A'}</div>
          <div className="text-sm text-gray-500">{application.applicantEmail || 'N/A'}</div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div>
          <div className="text-sm font-medium text-gray-900">{application.postingTitle || 'N/A'}</div>
          <div className="text-sm text-gray-500">{application.companyName || 'N/A'}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            application.postingType === 'internship'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {application.postingType}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(application.applicationStatus)}`}>
          {application.applicationStatus?.replace('_', ' ') || 'N/A'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {application.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          onClick={onView}
          className="text-blue-600 hover:text-blue-900"
        >
          View Details
        </button>
      </td>
    </tr>
  );
}

// Application Detail Modal Component
function ApplicationDetailModal({ application, onClose, onStatusUpdate, isUpdating }) {
  const [status, setStatus] = useState(application.applicationStatus);
  const [adminNotes, setAdminNotes] = useState(application.adminNotes || '');

  const handleUpdate = () => {
    onStatusUpdate(status, adminNotes);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Application Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Student Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Student Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Name:</span>
                  <p className="font-medium">{application.applicantName || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Email:</span>
                  <p className="font-medium">{application.applicantEmail || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Posting Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Posting Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Position:</span>
                  <p className="font-medium">{application.postingTitle || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Company:</span>
                  <p className="font-medium">{application.companyName || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Type:</span>
                  <p className="font-medium capitalize">{application.postingType || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Location:</span>
                  <p className="font-medium">{application.location || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Application Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Application Details</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Applied Date:</span>
                  <p className="font-medium">
                    {application.appliedAt ? new Date(application.appliedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                {application.reviewedAt && (
                  <div>
                    <span className="text-sm text-gray-600">Reviewed Date:</span>
                    <p className="font-medium">
                      {new Date(application.reviewedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {application.expectedSalary && (
                  <div>
                    <span className="text-sm text-gray-600">Expected Salary:</span>
                    <p className="font-medium">₹{application.expectedSalary.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Cover Letter */}
            {application.coverLetter && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Cover Letter</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-line">{application.coverLetter}</p>
                </div>
              </div>
            )}

            {/* Notes */}
            {application.notes && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Student Notes</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-line">{application.notes}</p>
                </div>
              </div>
            )}

            {/* Status Update */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interview_scheduled">Interview Scheduled</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="withdrawn">Withdrawn</option>
                    <option value="offer_extended">Offer Extended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    placeholder="Add notes about this application..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={handleUpdate}
                    disabled={isUpdating || status === application.applicationStatus}
                    className="px-6 py-2 bg-primaryColor text-whiteColor rounded-lg hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? 'Updating...' : 'Update Status'}
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
