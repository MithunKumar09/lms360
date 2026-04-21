"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import { format } from "date-fns";
import Image from "next/image";
import AdvancedPagination from "@/components/shared/courses/AdvancedPagination";
import ExportButtonSimple from "@/components/shared/export/ExportButtonSimple";
import { formatDateForCSV } from "@/lib/utils/export/csvExporter.js";

export default function MentorJobApplicationsMain() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editingApplication, setEditingApplication] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState("");
  const [notesUpdate, setNotesUpdate] = useState("");
  const limit = 20;

  // Fetch job details and applications
  const { data: applicationsData, isLoading } = useQuery({
    queryKey: ['job-applications', jobId, page, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      const response = await apiClient.get(`/jobs/${jobId}/applications?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch applications');
      }
      return response.data;
    },
    enabled: isAuthenticated && !!jobId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Update application status mutation
  const updateApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, application_status, notes }) => {
      const response = await apiClient.put(`/jobs/${jobId}/applications/${applicationId}`, {
        application_status,
        notes,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update application');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications', jobId] });
      queryClient.invalidateQueries({ queryKey: ['mentor-job-applications'] });
      createAlert('success', 'Application status updated successfully!');
      setEditingApplication(null);
      setStatusUpdate("");
      setNotesUpdate("");
    },
    onError: (error) => {
      console.error('Update application error:', error);
      createAlert('error', error.message || 'Failed to update application');
    },
  });

  // #region agent edit
  const job = applicationsData?.job && typeof applicationsData.job === 'object' ? applicationsData.job : null;
  const applications = Array.isArray(applicationsData?.applications) ? applicationsData.applications : [];
  const pagination = (applicationsData?.pagination && typeof applicationsData.pagination === 'object') ? applicationsData.pagination : {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };
  // #endregion

  // Filter applications by search term (client-side for better UX)
  // #region agent edit
  const filteredApplications = Array.isArray(applications) ? applications.filter((app) => {
    if (!app || typeof app !== 'object') return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const applicant = app.applicant && typeof app.applicant === 'object' ? app.applicant : {};
      return (
        (applicant.first_name && typeof applicant.first_name === 'string' && applicant.first_name.toLowerCase().includes(search)) ||
        (applicant.last_name && typeof applicant.last_name === 'string' && applicant.last_name.toLowerCase().includes(search)) ||
        (applicant.email && typeof applicant.email === 'string' && applicant.email.toLowerCase().includes(search)) ||
        (app.cover_letter && typeof app.cover_letter === 'string' && app.cover_letter.toLowerCase().includes(search))
      );
    }
    return true;
  }) : [];
  // #endregion

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditClick = (application) => {
    setEditingApplication(application.id);
    setStatusUpdate(application.application_status);
    setNotesUpdate(application.notes || "");
  };

  const handleCancelEdit = () => {
    setEditingApplication(null);
    setStatusUpdate("");
    setNotesUpdate("");
  };

  const handleSaveStatus = async (applicationId) => {
    if (!statusUpdate) {
      createAlert('error', 'Please select a status');
      return;
    }
    await updateApplicationMutation.mutateAsync({
      applicationId,
      application_status: statusUpdate,
      notes: notesUpdate || null,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'shortlisted':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading applications...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Job not found</p>
        <button
          onClick={() => router.push('/dashboards/mentor-applied-jobs')}
          className="mt-4 px-4 py-2 bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90"
        >
          Back to Applied Jobs
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="flex-1">
              <button
                onClick={() => router.push('/dashboards/mentor-applied-jobs')}
                className="mb-3 text-sm text-primaryColor hover:underline flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                Back to Applied Jobs
              </button>
              {/* #region agent edit */}
              <h1 className="h3 mb-2 fw-bold text-dark">{job.title || 'Untitled Job'}</h1>
              <p className="text-muted mb-0 small">
                {job.company || 'N/A'}
                {job.location && ` • ${job.location}`}
              </p>
              {/* #endregion */}
            </div>
          </div>
        </div>
      </div>

      {/* Application Summary */}
      <div className="p-6 mb-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
        <HeadingDashboard>Applications Summary</HeadingDashboard>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Total Applications</p>
            {/* #region agent edit */}
            <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">{typeof pagination.total === 'number' ? pagination.total : 0}</p>
            {/* #endregion */}
          </div>
          <div>
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {/* #region agent edit */}
              {Array.isArray(applications) ? applications.filter(a => a && typeof a === 'object' && a.application_status === 'pending').length : 0}
              {/* #endregion */}
            </p>
          </div>
          <div>
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Shortlisted</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {/* #region agent edit */}
              {Array.isArray(applications) ? applications.filter(a => a && typeof a === 'object' && a.application_status === 'shortlisted').length : 0}
              {/* #endregion */}
            </p>
          </div>
          <div>
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Accepted</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {/* #region agent edit */}
              {Array.isArray(applications) ? applications.filter(a => a && typeof a === 'object' && a.application_status === 'accepted').length : 0}
              {/* #endregion */}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-6 mb-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark">
        <div className="flex items-center justify-between mb-4">
          <HeadingDashboard>Applications</HeadingDashboard>
          {/* #region agent edit */}
          {Array.isArray(filteredApplications) && filteredApplications.length > 0 && (
            <ExportButtonSimple
              data={filteredApplications
                .filter(app => app && typeof app === 'object' && app.applicant && typeof app.applicant === 'object')
                .map(app => ({
                  name: `${app.applicant?.first_name || ''} ${app.applicant?.last_name || ''}`.trim() || 'Unknown',
                  email: app.applicant?.email || 'N/A',
                  applied_at: app.applied_at ? formatDateForCSV(app.applied_at) : 'N/A',
                  application_status: app.application_status || 'N/A',
                  cover_letter: app.cover_letter || '',
                  resume_url: app.resume_url || '',
                  reviewed_at: app.reviewed_at ? formatDateForCSV(app.reviewed_at) : '',
                  notes: app.notes || '',
                }))}
              headers={[
                { key: 'name', label: 'Applicant Name' },
                { key: 'email', label: 'Email' },
                { key: 'applied_at', label: 'Applied At' },
                { key: 'application_status', label: 'Status' },
                { key: 'cover_letter', label: 'Cover Letter' },
                { key: 'resume_url', label: 'Resume URL' },
                { key: 'reviewed_at', label: 'Reviewed At' },
                { key: 'notes', label: 'Notes' },
              ]}
              filename={`job-applications-${(job.title || 'job').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`}
            />
          )}
          {/* #endregion */}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name, email, or cover letter..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Application Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="rejected">Rejected</option>
              <option value="accepted">Accepted</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications List */}
      {/* Applications List */}
      {!Array.isArray(filteredApplications) || filteredApplications.length === 0 ? (
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            {searchTerm ? 'No applications found matching your search.' : 'No applications found for this job.'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {filteredApplications
              .filter(app => app && typeof app === 'object' && app.id && app.applicant && typeof app.applicant === 'object')
              .map((app) => (
              <div
                key={app.id}
                className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark"
              >
                <div className="flex items-start gap-4 mb-4">
                  {/* Applicant Avatar */}
                  {/* #region agent edit */}
                  {app.applicant?.avatar_url ? (
                    <Image
                      src={app.applicant.avatar_url}
                      alt={`${app.applicant?.first_name || ''} ${app.applicant?.last_name || ''}`.trim() || 'Applicant'}
                      width={60}
                      height={60}
                      className="rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-15 h-15 rounded-full bg-primaryColor/20 flex items-center justify-center text-primaryColor font-semibold text-xl">
                      {((app.applicant?.first_name && app.applicant.first_name[0]) || (app.applicant?.email && app.applicant.email[0]) || '?').toUpperCase()}
                    </div>
                  )}
                  {/* #endregion */}

                  {/* Applicant Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor">
                          {/* #region agent edit */}
                          {`${app.applicant?.first_name || ''} ${app.applicant?.last_name || ''}`.trim() || 'Unknown Applicant'}
                          {/* #endregion */}
                        </h3>
                        <p className="text-sm text-contentColor dark:text-contentColor-dark">
                          {app.applicant?.email || 'N/A'}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(app.application_status || 'pending')}`}>
                        {app.application_status || 'pending'}
                      </span>
                    </div>

                    <div className="text-sm text-contentColor dark:text-contentColor-dark mb-3">
                      {app.applied_at && !isNaN(new Date(app.applied_at).getTime()) && (
                      <p>Applied: {format(new Date(app.applied_at), 'PPP p')}</p>
                      )}
                      {app.reviewed_at && !isNaN(new Date(app.reviewed_at).getTime()) && (
                        <p>Reviewed: {format(new Date(app.reviewed_at), 'PPP p')}</p>
                      )}
                    </div>

                    {/* Cover Letter */}
                    {app.cover_letter && (
                      <div className="mb-3 p-3 bg-lightGrey5 dark:bg-whiteColor-dark rounded-md">
                        <p className="text-sm font-semibold text-blackColor dark:text-whiteColor mb-1">
                          Cover Letter:
                        </p>
                        <p className="text-sm text-contentColor dark:text-contentColor-dark line-clamp-3">
                          {app.cover_letter}
                        </p>
                      </div>
                    )}

                    {/* Resume Link */}
                    {app.resume_url && (
                      <div className="mb-3">
                        <a
                          href={app.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primaryColor hover:underline flex items-center gap-2"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>
                          View Resume
                        </a>
                      </div>
                    )}

                    {/* Notes (if exists) */}
                    {app.notes && (
                      <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <p className="text-sm font-semibold text-blackColor dark:text-whiteColor mb-1">
                          Notes:
                        </p>
                        <p className="text-sm text-contentColor dark:text-contentColor-dark">
                          {app.notes}
                        </p>
                      </div>
                    )}

                    {/* Status Update Section */}
                    {editingApplication === app.id ? (
                      <div className="mt-4 p-4 bg-lightGrey5 dark:bg-whiteColor-dark rounded-md border border-borderColor dark:border-borderColor-dark">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                              Application Status
                            </label>
                            <select
                              value={statusUpdate}
                              onChange={(e) => setStatusUpdate(e.target.value)}
                              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
                            >
                              <option value="pending">Pending</option>
                              <option value="reviewed">Reviewed</option>
                              <option value="shortlisted">Shortlisted</option>
                              <option value="rejected">Rejected</option>
                              <option value="accepted">Accepted</option>
                              <option value="withdrawn">Withdrawn</option>
                            </select>
                          </div>
                          <div>
                            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                              Notes (Optional)
                            </label>
                            <textarea
                              value={notesUpdate}
                              onChange={(e) => setNotesUpdate(e.target.value)}
                              placeholder="Add internal notes..."
                              rows="3"
                              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveStatus(app.id)}
                            disabled={updateApplicationMutation.isPending}
                            className="px-4 py-2 text-sm font-semibold text-whiteColor bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50"
                          >
                            {updateApplicationMutation.isPending ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={updateApplicationMutation.isPending}
                            className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-lightGrey5 dark:bg-whiteColor-dark rounded-md hover:bg-opacity-80 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleEditClick(app)}
                          className="px-4 py-2 text-sm font-semibold text-primaryColor bg-primaryColor/10 rounded-md hover:bg-primaryColor/20 transition-colors"
                        >
                          Update Status
                        </button>
                        {app.resume_url && (
                          <a
                            href={app.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                          >
                            Download Resume
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {typeof pagination?.totalPages === 'number' && pagination.totalPages > 1 && (
            <div className="mb-6">
              <AdvancedPagination
                currentPage={typeof pagination.page === 'number' ? pagination.page : 1}
                totalPages={typeof pagination.totalPages === 'number' ? pagination.totalPages : 1}
                limit={typeof pagination.limit === 'number' ? pagination.limit : 20}
                totalItems={typeof pagination.total === 'number' ? pagination.total : 0}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
