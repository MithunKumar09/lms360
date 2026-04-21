"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import Link from "next/link";
import { format } from "date-fns";
import { useAuthStore } from "@/store/index.js";
import { useOrganizations } from "@/hooks/api/useDropdownData.js";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import ThemeController from "@/components/shared/others/ThemeController";

export default function JobsPage() {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    status: userRole ? '' : 'published', // Empty for authenticated users, published for public
    search: '',
    job_type: '',
    organization_id: '',
  });

  // Fetch organizations for superadmin
  const { data: orgsData } = useOrganizations(
    { limit: 100, status: 'active' },
    { enabled: userRole === 'superadmin' }
  );
  const organizations = orgsData?.organizations || [];

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs', filters, userRole],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
      });
      
      // Add filters
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.status) {
        params.append('status', filters.status);
      } else if (!isAuthenticated) {
        // Public users: only published by default
        params.append('published_only', 'true');
      }
      if (filters.job_type) {
        params.append('job_type', filters.job_type);
      }
      if (filters.organization_id) {
        params.append('organization_id', filters.organization_id);
      }
      
      const response = await apiClient.get(`/jobs?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch jobs');
      }
      return response.data;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const jobs = jobsData?.jobs || [];
  const pagination = jobsData?.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 };

  const formatSalary = (min, max, currency = "INR") => {
    if (!min && !max) return "Not specified";
    const formattedMin = min ? new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 0 }).format(min) : "";
    const formattedMax = max ? new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 0 }).format(max) : "";
    if (min && max) return `${formattedMin} - ${formattedMax}`;
    if (min) return `${formattedMin}+`;
    if (max) return `Up to ${formattedMax}`;
    return "Not specified";
  };

  const JobCard = ({ job }) => {
    const isExpired = job.application_deadline && new Date(job.application_deadline) < new Date();

    return (
      <Link href={`/jobs/${job.id}`}>
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark hover:shadow-lg transition-shadow cursor-pointer p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-blackColor dark:text-whiteColor mb-1">
                {job.title}
              </h3>
              <p className="text-lg text-contentColor dark:text-contentColor-dark mb-2">
                {job.company}
                {job.location && <span className="ml-2">• {job.location}</span>}
              </p>
            </div>
            {isExpired && (
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 ml-2">
                Expired
              </span>
            )}
          </div>

          {job.description && (
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-3 line-clamp-2">
              {job.description}
            </p>
          )}

          <div className="space-y-2 text-sm text-contentColor dark:text-contentColor-dark mb-3">
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
                  {job.skills.slice(0, 5).map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-primaryColor/10 text-primaryColor rounded text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                  {job.skills.length > 5 && (
                    <span className="px-2 py-1 text-xs text-contentColor dark:text-contentColor-dark">
                      +{job.skills.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
            {job.application_deadline && (
              <p>
                <strong>Deadline:</strong> {format(new Date(job.application_deadline), 'PPP')}
              </p>
            )}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <PageWrapper>
      <main>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-blackColor dark:text-whiteColor mb-2">Jobs</h1>
              <p className="text-contentColor dark:text-contentColor-dark">
                Find your next career opportunity
              </p>
            </div>

        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search jobs..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            />
            <select
              value={filters.job_type}
              onChange={(e) => setFilters({ ...filters, job_type: e.target.value, page: 1 })}
              className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            >
              <option value="">All Job Types</option>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="freelance">Freelance</option>
            </select>
          </div>

          {/* Organization filter - Superadmin only */}
          {userRole === 'superadmin' && (
            <div>
              <select
                value={filters.organization_id}
                onChange={(e) => setFilters({ ...filters, organization_id: e.target.value, page: 1 })}
                className="w-full max-w-md py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              >
                <option value="">All Organizations</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-contentColor dark:text-contentColor-dark">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
            <p className="text-contentColor dark:text-contentColor-dark">
              {filters.search || filters.job_type ? 'No jobs found matching your filters.' : 'No jobs available at the moment.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-contentColor dark:text-contentColor-dark">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
          </div>
        </div>
        <ThemeController />
      </main>
    </PageWrapper>
  );
}

