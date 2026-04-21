/**
 * Superadmin Blogs List Component
 * 
 * List view for superadmin blog management.
 * Displays global blogs in a table with edit/delete actions.
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBlogs } from '@/hooks/api/useBlogs';
import { useDeleteBlog } from '@/hooks/api/useBlogsMutations';
import useSweetAlert from '@/hooks/useSweetAlert';
import Image from 'next/image';

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

/**
 * Get scope badge styling
 */
function getScopeBadgeClass(scope) {
  switch (scope) {
    case 'global':
      return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400';
    case 'organization':
      return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400';
    case 'personal':
      return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400';
  }
}

export default function SuperadminBlogsList({ onCreate, onEdit }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createAlert = useSweetAlert();
  const deleteBlog = useDeleteBlog();

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [scope, setScope] = useState(searchParams.get('scope') || 'global');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const limit = 10;

  const filters = useMemo(() => ({
    scope,
    status: status || undefined,
    search: search || undefined,
    page,
    limit,
    sortBy: 'created_at',
    sortDir: 'desc',
  }), [scope, status, search, page, limit]);

  const { data, isLoading, isError, error } = useBlogs({
    filters,
    enabled: true,
  });

  const blogs = data?.blogs || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 0;

  // Handle delete
  const handleDelete = useCallback(async (blog) => {
    const confirmed = await createAlert(
      'warning',
      `Are you sure you want to delete "${blog.title}"?`,
      'This action cannot be undone.',
      true
    );

    if (confirmed) {
      try {
        await deleteBlog.mutateAsync(blog.id);
      } catch (error) {
        // Error is handled by mutation hook
      }
    }
  }, [deleteBlog, createAlert]);

  // Update URL when filters change
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (status) params.set('status', status);
    if (scope !== 'global') params.set('scope', scope);
    if (page > 1) params.set('page', page.toString());

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(`/dashboards/superadmin-blogs${newUrl}`, { scroll: false });
  }, [search, status, scope, page, router]);

  // Update URL when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateUrl();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [search, status, scope, page, updateUrl]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Blog Management
          </h1>
          <p className="text-sm text-contentColor dark:text-contentColor-dark mt-1">
            Manage global blogs visible to all users
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
          Create Blog
        </button>
      </div>

      {/* Filters */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark p-4 rounded-lg shadow-sm border border-borderColor dark:border-borderColor-dark">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search blogs..."
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor dark:bg-whiteColor-dark dark:text-blackColor-dark"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor dark:bg-whiteColor-dark dark:text-blackColor-dark"
            >
              <option value="">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Scope Filter */}
          <div>
            <label className="block text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              Scope
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor dark:bg-whiteColor-dark dark:text-blackColor-dark"
            >
              <option value="global">Global</option>
              <option value="organization">Organization</option>
              <option value="personal">Personal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-20">
          <p className="text-contentColor dark:text-contentColor-dark">Loading blogs...</p>
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

      {/* Blogs Table */}
      {!isLoading && !isError && (
        <>
          {blogs.length > 0 ? (
            <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-sm border border-borderColor dark:border-borderColor-dark overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-lightGrey5 dark:bg-lightGrey5-dark">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-blackColor dark:text-blackColor-dark uppercase tracking-wider">
                        Blog
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-blackColor dark:text-blackColor-dark uppercase tracking-wider">
                        Scope
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-blackColor dark:text-blackColor-dark uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-blackColor dark:text-blackColor-dark uppercase tracking-wider">
                        Author
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-blackColor dark:text-blackColor-dark uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-blackColor dark:text-blackColor-dark uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderColor dark:divide-borderColor-dark">
                    {blogs.map((blog) => (
                      <tr key={blog.id} className="hover:bg-lightGrey5 dark:hover:bg-lightGrey5-dark transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {blog.featured_image_url ? (
                              <div className="w-16 h-16 relative rounded-md overflow-hidden flex-shrink-0">
                                <img
                                  src={blog.featured_image_url}
                                  alt={blog.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 bg-lightGrey5 dark:bg-lightGrey5-dark rounded-md flex-shrink-0 flex items-center justify-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
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
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark truncate">
                                {blog.title}
                              </p>
                              {blog.excerpt && (
                                <p className="text-xs text-contentColor dark:text-contentColor-dark truncate mt-1">
                                  {blog.excerpt}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getScopeBadgeClass(blog.scope)}`}>
                            {blog.scope}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(blog.status)}`}>
                            {blog.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {blog.author?.avatar_url ? (
                              <img
                                src={blog.author.avatar_url}
                                alt={blog.author.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primaryColor/20 flex items-center justify-center">
                                <span className="text-xs font-semibold text-primaryColor">
                                  {blog.author?.name?.[0]?.toUpperCase() || 'A'}
                                </span>
                              </div>
                            )}
                            <span className="text-sm text-blackColor dark:text-blackColor-dark">
                              {blog.author?.name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-contentColor dark:text-contentColor-dark">
                          {formatDate(blog.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark">
              <p className="text-contentColor dark:text-contentColor-dark">
                No blogs found. Create your first blog to get started.
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-contentColor dark:text-contentColor-dark">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} blogs
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-borderColor dark:border-borderColor-dark rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-lightGrey5 dark:hover:bg-lightGrey5-dark transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-borderColor dark:border-borderColor-dark rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-lightGrey5 dark:hover:bg-lightGrey5-dark transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
