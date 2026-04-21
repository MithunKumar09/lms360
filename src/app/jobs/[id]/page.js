"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import apiClient from "@/lib/api/client.js";
import { format } from "date-fns";
import Link from "next/link";

export default function JobDetailsPage() {
  const params = useParams();
  const jobId = params.id;

  const { data: jobData, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const response = await apiClient.get(`/jobs/${jobId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch job');
      }
      return response.data;
    },
    enabled: !!jobId,
  });

  const job = jobData?.job;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-contentColor dark:text-contentColor-dark">Loading job...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-contentColor dark:text-contentColor-dark">Job not found</p>
            <Link href="/jobs" className="text-primaryColor hover:underline mt-4 inline-block">
              Back to Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formatSalary = (min, max, currency = "INR") => {
    if (!min && !max) return "Not specified";
    const formattedMin = min ? new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 0 }).format(min) : "";
    const formattedMax = max ? new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 0 }).format(max) : "";
    if (min && max) return `${formattedMin} - ${formattedMax}`;
    if (min) return `${formattedMin}+`;
    if (max) return `Up to ${formattedMax}`;
    return "Not specified";
  };

  const isExpired = job.application_deadline && new Date(job.application_deadline) < new Date();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link href="/jobs" className="text-primaryColor hover:underline mb-4 inline-block">
          ← Back to Jobs
        </Link>

        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark p-6 md:p-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-blackColor dark:text-whiteColor mb-2">
                {job.title}
              </h1>
              <p className="text-xl text-contentColor dark:text-contentColor-dark mb-4">
                {job.company}
                {job.location && <span className="ml-2">• {job.location}</span>}
              </p>
            </div>
            {isExpired && (
              <span className="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 ml-4">
                Expired
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm text-contentColor dark:text-contentColor-dark">
            <div>
              <strong>Job Type:</strong> {job.job_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
            <div>
              <strong>Salary:</strong> {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
            </div>
            {job.application_deadline && (
              <div>
                <strong>Application Deadline:</strong> {format(new Date(job.application_deadline), 'PPP p')}
              </div>
            )}
            {job.location && (
              <div>
                <strong>Location:</strong> {job.location}
              </div>
            )}
          </div>

          {job.skills && job.skills.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-blackColor dark:text-whiteColor mb-3">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-primaryColor/10 text-primaryColor rounded-full text-sm font-semibold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {job.description && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-blackColor dark:text-whiteColor mb-3">Description</h2>
              <p className="text-contentColor dark:text-contentColor-dark whitespace-pre-wrap">
                {job.description}
              </p>
            </div>
          )}

          {job.full_description && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-blackColor dark:text-whiteColor mb-3">Full Description</h2>
              <div 
                className="text-contentColor dark:text-contentColor-dark prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: job.full_description }}
              />
            </div>
          )}

          {job.external_apply_link && (
            <div className="mb-6">
              <a
                href={job.external_apply_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors font-semibold"
              >
                Apply Now
              </a>
            </div>
          )}

          {job.organization && (
            <div className="pt-6 border-t-2 border-borderColor dark:border-borderColor-dark">
              <p className="text-sm text-contentColor dark:text-contentColor-dark">
                <strong>Posted by:</strong> {job.organization.name}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

