"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import { format } from "date-fns";
import Link from "next/link";
import ExportButtonSimple from "@/components/shared/export/ExportButtonSimple";

export default function MentorAppliedJobsMain() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobTypeFilter, setJobTypeFilter] = useState("all");

  // Fetch mentor's job applications
  const { data: applicationsData, isLoading } = useQuery({
    queryKey: ['mentor-job-applications', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const response = await apiClient.get(`/mentors/jobs/applications?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch job applications');
      }
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const applications = applicationsData?.applications || [];
  const statistics = applicationsData?.statistics || {};

  // Group applications by job
  const jobsMap = new Map();
  applications.forEach((app) => {
    if (!jobsMap.has(app.job.id)) {
      jobsMap.set(app.job.id, {
        job: app.job,
        applications: [],
        applicationCount: 0,
      });
    }
    jobsMap.get(app.job.id).applications.push(app);
    jobsMap.get(app.job.id).applicationCount++;
  });

  const jobs = Array.from(jobsMap.values());

  // Filter jobs
  const filteredJobs = jobs.filter((item) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        item.job.title?.toLowerCase().includes(search) ||
        item.job.company?.toLowerCase().includes(search) ||
        item.job.location?.toLowerCase().includes(search)
      );
    }
    if (jobTypeFilter !== 'all' && item.job.job_type !== jobTypeFilter) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading applied jobs...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="h3 mb-2 fw-bold text-dark">Applied Jobs</h1>
              <p className="text-muted mb-0 small">
                View jobs with application counts
              </p>
            </div>
            {filteredJobs.length > 0 && (
              <ExportButtonSimple
                data={filteredJobs.map(item => ({
                  title: item.job.title,
                  company: item.job.company,
                  location: item.job.location || '',
                  job_type: item.job.job_type?.replace('_', ' ') || '',
                  applications: item.applicationCount,
                }))}
                headers={[
                  { key: 'title', label: 'Job Title' },
                  { key: 'company', label: 'Company' },
                  { key: 'location', label: 'Location' },
                  { key: 'job_type', label: 'Job Type' },
                  { key: 'applications', label: 'Applications' },
                ]}
                filename={`applied-jobs-${new Date().toISOString().split('T')[0]}`}
                className="ml-auto"
              />
            )}
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Total Applications</p>
            <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">
              {statistics.total_applications || 0}
            </p>
          </div>
          <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Jobs with Applications</p>
            <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">
              {statistics.jobs_with_applications || 0}
            </p>
          </div>
          <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Pending Applications</p>
            <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">
              {statistics.by_status?.pending || 0}
            </p>
          </div>
          <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border border-borderColor dark:border-borderColor-dark">
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Shortlisted</p>
            <p className="text-2xl font-bold text-blackColor dark:text-whiteColor">
              {statistics.by_status?.shortlisted || 0}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Search Jobs
          </label>
          <input
            type="text"
            placeholder="Search by title, company, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Filter by Application Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="rejected">Rejected</option>
            <option value="accepted">Accepted</option>
          </select>
        </div>
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Filter by Job Type
          </label>
          <select
            value={jobTypeFilter}
            onChange={(e) => setJobTypeFilter(e.target.value)}
            className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          >
            <option value="all">All Types</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
            <option value="freelance">Freelance</option>
          </select>
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            {searchTerm ? 'No jobs found matching your search.' : 'No applied jobs found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredJobs.map((item) => (
            <div
              key={item.job.id}
              className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md overflow-hidden border-2 border-borderColor dark:border-borderColor-dark hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-blackColor dark:text-whiteColor mb-2">
                      {item.job.title}
                    </h3>
                    <p className="text-lg text-contentColor dark:text-contentColor-dark mb-1">
                      {item.job.company}
                      {item.job.location && <span className="ml-2">• {item.job.location}</span>}
                    </p>
                    <p className="text-sm text-contentColor dark:text-contentColor-dark">
                      {item.job.job_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                </div>

                {/* Application Count */}
                <div className="mb-4 p-3 bg-lightGrey5 dark:bg-whiteColor-dark rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-blackColor dark:text-whiteColor">
                      Total Applications
                    </span>
                    <span className="text-2xl font-bold text-primaryColor">
                      {item.applicationCount}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/dashboards/mentor-job-applications/${item.job.id}`}
                    className="flex-1 px-4 py-2 text-sm font-semibold text-whiteColor bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors text-center"
                  >
                    View Applications ({item.applicationCount})
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
