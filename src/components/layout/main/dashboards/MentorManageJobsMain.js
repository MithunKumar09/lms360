"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import { format } from "date-fns";

export default function MentorManageJobsMain() {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch mentor's jobs
  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['mentor-jobs', userId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ created_by: userId });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const response = await apiClient.get(`/jobs?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch jobs');
      }
      return response.data;
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // #region agent edit
  const jobs = Array.isArray(jobsData?.jobs) ? jobsData.jobs : [];
  // #endregion

  // Delete mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId) => {
      const response = await apiClient.delete(`/jobs/${jobId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete job');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-jobs'] });
      createAlert('success', 'Job deleted successfully!');
    },
    onError: (error) => {
      console.error('Delete job error:', error);
      createAlert('error', error.message || 'Failed to delete job');
    },
  });

  const handleDelete = async (jobId, jobTitle) => {
    if (!confirm(`Are you sure you want to delete "${jobTitle}"?`)) {
      return;
    }
    await deleteJobMutation.mutateAsync(jobId);
  };

  const formatSalary = (min, max, currency = "INR") => {
    if (!min && !max) return "Not specified";
    const formattedMin = min ? new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 0 }).format(min) : "";
    const formattedMax = max ? new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 0 }).format(max) : "";
    if (min && max) return `${formattedMin} - ${formattedMax}`;
    if (min) return `${formattedMin}+`;
    if (max) return `Up to ${formattedMax}`;
    return "Not specified";
  };

  // #region agent edit
  const filteredJobs = Array.isArray(jobs) ? jobs.filter((job) => {
    if (!job || typeof job !== 'object') return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        (job.title && typeof job.title === 'string' && job.title.toLowerCase().includes(search)) ||
        (job.company && typeof job.company === 'string' && job.company.toLowerCase().includes(search)) ||
        (job.description && typeof job.description === 'string' && job.description.toLowerCase().includes(search))
      );
    }
    return true;
  }) : [];
  // #endregion

  const JobCard = ({ job }) => {
    if (!job || typeof job !== 'object' || !job.id) {
      return null;
    }
    
    return (
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md overflow-hidden border-2 border-borderColor dark:border-borderColor-dark hover:shadow-lg transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-blackColor dark:text-whiteColor mb-1">
            {job.title || 'Untitled Job'}
          </h3>
          <p className="text-lg text-contentColor dark:text-contentColor-dark mb-2">
            {job.company || 'N/A'}
            {job.location && <span className="ml-2">• {job.location}</span>}
          </p>
        </div>
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full ml-2 ${
            job.status === 'published'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : job.status === 'draft'
              ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
              : job.status === 'closed'
              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}
        >
          {job.status}
        </span>
      </div>

      {job.description && (
        <p className="text-sm text-contentColor dark:text-contentColor-dark mb-3 line-clamp-2">
          {job.description}
        </p>
      )}

      <div className="space-y-2 text-sm text-contentColor dark:text-contentColor-dark mb-4">
        <p>
          <strong>Type:</strong> {job.job_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </p>
        <p>
          <strong>Salary:</strong> {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
        </p>
        {job.skills && job.skills.length > 0 && (
          <div>
            <strong>Skills:</strong>{" "}
            <div className="flex flex-wrap gap-1 mt-1">
              {job.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-primaryColor/10 text-primaryColor rounded text-xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
        {job.application_deadline && (
          <p>
            <strong>Deadline:</strong> {format(new Date(job.application_deadline), 'PPP p')}
          </p>
        )}
        {job.external_apply_link && (
          <p>
            <strong>Apply:</strong>{" "}
            <a
              href={job.external_apply_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primaryColor hover:underline"
            >
              External Link
            </a>
          </p>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => router.push(`/dashboards/mentor-edit-job/${job.id}`)}
          className="px-3 py-1 text-xs font-semibold text-primaryColor bg-primaryColor/10 rounded-md hover:bg-primaryColor/20 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => router.push(`/jobs/${job.id}`)}
          className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
        >
          View
        </button>
        <button
          onClick={() => handleDelete(job.id, job.title)}
          disabled={deleteJobMutation.isPending}
          className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-50 rounded-md hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading jobs...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="h3 mb-2 fw-bold text-dark">Manage Jobs</h1>
              <p className="text-muted mb-0 small">
                View and manage your job postings
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboards/mentor-add-job')}
              className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors"
            >
              + Add Job
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Search
          </label>
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Status Filter
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {!Array.isArray(filteredJobs) || filteredJobs.length === 0 ? (
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            {searchTerm ? 'No jobs found matching your search.' : 'No jobs found. Create your first job posting!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredJobs
            .filter(job => job && typeof job === 'object' && job.id)
            .map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

