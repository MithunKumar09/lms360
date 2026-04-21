/**
 * Student Blogs List Component
 * 
 * List view for student's personal blogs.
 * Displays student's own blogs with create/edit/delete actions.
 */

'use client';

import { useState } from 'react';
import { useBlogs } from '@/hooks/api/useBlogs';
import { useDeleteBlog } from '@/hooks/api/useBlogsMutations';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';
import Link from 'next/link';

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get status badge styling
 */
function getStatusBadgeClass(status) {
  switch (status) {
    case 'published':
      return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400';
    case 'draft':
      return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400';
    case 'archived':
      return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400';
  }
}

export default function StudentBlogsList({ onCreate, onEdit }) {
  const createAlert = useSweetAlert();
  const deleteBlog = useDeleteBlog();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  // Fetch student's personal blogs
  const { data, isLoading, isError, error, refetch } = useBlogs({
    filters: {
      scope: 'personal',
      author_id: userId,
      page: 1,
      limit: 50, // Show all student blogs (reasonable limit)
      sortBy: 'created_at',
      sortDir: 'desc',
    },
    enabled: !!userId,
  });

  const blogs = data?.blogs || [];

  // Handle delete
  const handleDelete = async (blog) => {
    const confirmed = await createAlert(
      'warning',
      `Are you sure you want to delete "${blog.title}"?`,
      'This action cannot be undone.',
      true
    );

    if (confirmed) {
      try {
        await deleteBlog.mutateAsync(blog.id);
        // Query invalidation is handled by mutation hook, but refetch ensures immediate update
        refetch();
      } catch (error) {
        // Error is handled by mutation hook
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            My Blogs
          </h1>
          <p className="text-sm text-contentColor dark:text-contentColor-dark mt-1">
            Manage your personal blog posts
          </p>
        </div>
        <button
          onClick={onCreate}
          className="px-4 py-2 bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90 transition-colors font-semibold flex items-center gap-2"
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
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create New Blog
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-20">
          <p className="text-contentColor dark:text-contentColor-dark">Loading your blogs...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="text-center py-20">
          <p className="text-red-500">
            {error?.message || 'Failed to load blogs. Please try again later.'}
          </p>
        </div>
      )}

      {/* Blogs Grid */}
      {!isLoading && !isError && (
        <>
          {blogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((blog) => (
                <div
                  key={blog.id}
                  className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-sm border border-borderColor dark:border-borderColor-dark overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Featured Image */}
                  {blog.featured_image_url ? (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={blog.featured_image_url}
                        alt={blog.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-lightGrey5 dark:bg-lightGrey5-dark flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-contentColor dark:text-contentColor-dark"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(blog.status)}`}>
                        {blog.status}
                      </span>
                      <span className="text-xs text-contentColor dark:text-contentColor-dark">
                        {formatDate(blog.created_at)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-blackColor dark:text-blackColor-dark line-clamp-2">
                      {blog.title}
                    </h3>

                    {/* Excerpt */}
                    {blog.excerpt && (
                      <p className="text-sm text-contentColor dark:text-contentColor-dark line-clamp-3">
                        {blog.excerpt}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-borderColor dark:border-borderColor-dark">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEdit(blog)}
                          className="px-3 py-1 text-sm text-primaryColor hover:bg-primaryColor/10 rounded-md transition-colors"
                          title="Edit"
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
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(blog)}
                          disabled={deleteBlog.isPending}
                          className="px-3 py-1 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
                          title="Delete"
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
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                      {blog.slug && (
                        <Link
                          href={`/blogs/${blog.slug}`}
                          className="text-sm text-primaryColor hover:underline"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="mx-auto text-contentColor dark:text-contentColor-dark mb-4"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <p className="text-contentColor dark:text-contentColor-dark mb-4">
                You haven&apos;t created any blogs yet.
              </p>
              <button
                onClick={onCreate}
                className="px-4 py-2 bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90 transition-colors font-semibold"
              >
                Create Your First Blog
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
