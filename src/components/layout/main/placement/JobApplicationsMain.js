/**
 * Job Applications Main Component
 */

'use client';

import { useState } from 'react';
import { usePostings, useCreateApplication, useApplications } from '@/hooks/api/usePlacement.js';
import PostingCard from '@/components/shared/placement/PostingCard.js';
import ApplicationList from '@/components/shared/placement/ApplicationList.js';
import PostingCardSkeleton from '@/components/shared/placement/PostingCardSkeleton.js';

export default function JobApplicationsMain() {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: postingsData, isLoading: postingsLoading } = usePostings({
    postingType: 'job',
    status: 'active',
    search: searchTerm || null,
    page,
    pageSize
  });

  const { data: applicationsData } = useApplications({ postingType: 'job' });
  const createApplication = useCreateApplication();

  // API returns { success: true, data: [...], pagination: {...} }
  const postings = postingsData?.data || [];
  const applications = applicationsData?.data || [];

  const handleApply = async (postingId, resumeVersionId) => {
    try {
      await createApplication.mutateAsync({
        postingId,
        resumeVersionId
      });
    } catch (error) {
      console.error('Error applying:', error);
    }
  };

  // Filter by location if needed
  const filteredPostings = locationFilter
    ? postings.filter(p => p.location?.toLowerCase().includes(locationFilter.toLowerCase()))
    : postings;

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Job Opportunities</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Browse and apply to available job positions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Postings */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-4">
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <input
              type="text"
              placeholder="Filter by location..."
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Postings List */}
          {postingsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <PostingCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredPostings.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No jobs found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPostings.map((posting) => (
                <PostingCard
                  key={posting.id}
                  posting={posting}
                  onApply={handleApply}
                  isApplying={createApplication.isPending}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {postingsData?.pagination && postingsData.pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {page} of {postingsData.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(postingsData.pagination.totalPages, p + 1))}
                disabled={page === postingsData.pagination.totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Sidebar - Application History */}
        <div className="lg:col-span-1">
          <ApplicationList applications={applications} title="My Job Applications" />
        </div>
      </div>
    </div>
  );
}
