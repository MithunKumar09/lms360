"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBlogs, useDeleteBlog } from "@/hooks/api/useBlogs.js";
import Image from "next/image";

function Badge({ children, color = "gray" }) {
  const map = {
    green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  };
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs ${map[color] || map.gray}`}>{children}</span>;
}

function cls(...a) { return a.filter(Boolean).join(" "); }
function Button({ children, variant = "primary", className = "", href, ...rest }) {
  const base = "inline-flex items-center justify-center gap-2 transition rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2";
  const variants = {
    primary: "text-white bg-gradient-to-tr from-primaryColor to-primaryColor/90 hover:to-primaryColor/80 shadow-sm focus:ring-primaryColor/40",
    soft: "text-primaryColor bg-primaryColor/10 hover:bg-primaryColor/15 focus:ring-primaryColor/20",
    neutral: "text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:ring-gray-300",
    danger: "text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 focus:ring-red-300",
    ghost: "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800",
  };
  const cn = cls(base, variants[variant] || variants.primary, className);
  if (href) {
    return <Link href={href} className={cn} {...rest}>{children}</Link>;
  }
  return <button className={cn} {...rest}>{children}</button>;
}

export default function SuperadminBlogsMain() {
  const pathname = usePathname();
  const baseListPath = "/dashboards/superadmin-blogs";
  const newPath = `${baseListPath}/new`;
  
  // UI state (local only)
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({
    scope: "global", // Default to global for superadmin
    status: "",
  });
  const [sort, setSort] = useState({ by: "created_at", dir: "desc" });
  const [page, setPage] = useState(1);
  const limit = 10;

  // Build query filters for React Query
  const queryFilters = useMemo(() => {
    const params = {
      page: String(page),
      limit: String(limit),
      scope: filters.scope || "global",
    };
    
    if (q) params.search = q;
    if (filters.status) params.status = filters.status;
    if (sort.by) params.sortBy = sort.by;
    if (sort.dir) params.sortDir = sort.dir;
    
    return params;
  }, [page, limit, q, filters, sort]);

  // Fetch blogs using React Query
  const { data, isLoading, error, refetch } = useBlogs({
    filters: queryFilters,
    enabled: true,
  });

  const items = data?.blogs || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };

  // Delete mutation
  const deleteBlog = useDeleteBlog();

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const onDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this blog?")) return;
    try {
      await deleteBlog.mutateAsync(id);
    } catch (e) {
      // Error is handled by the mutation hook
      console.error('Delete error:', e);
    }
  };

  const changePage = (p) => {
    if (p < 1 || p > (pagination.totalPages || 1)) return;
    setPage(p);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm">
          Error: {error.message || 'Failed to load blogs'} 
          <button className="btn ml-2" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between bg-whiteColor dark:bg-whiteColor-dark rounded shadow-accordion dark:shadow-accordion-dark px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primaryColor/10 text-primaryColor">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-file-text">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </span>
          <div>
            <h2 className="text-base font-semibold text-blackColor dark:text-blackColor-dark">Blogs</h2>
            <p className="text-xs text-contentColor dark:text-contentColor-dark">Create and manage global blogs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" href={newPath}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-plus">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Blog
          </Button>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={onSearch} className="flex flex-wrap gap-2 items-end bg-whiteColor dark:bg-whiteColor-dark rounded shadow-accordion dark:shadow-accordion-dark p-3">
        <input 
          className="input" 
          placeholder="Search blogs..." 
          value={q} 
          onChange={(e) => setQ(e.target.value)} 
        />
        <select 
          className="select" 
          value={filters.scope} 
          onChange={(e) => setFilters({ ...filters, scope: e.target.value })}
        >
          <option value="global">Global</option>
          <option value="organization">Organization</option>
        </select>
        <select 
          className="select" 
          value={filters.status} 
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">Any status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select 
          className="select" 
          value={sort.by} 
          onChange={(e) => setSort({ ...sort, by: e.target.value })}
        >
          <option value="created_at">Created</option>
          <option value="updated_at">Updated</option>
          <option value="published_at">Published</option>
          <option value="title">Title</option>
        </select>
        <select 
          className="select" 
          value={sort.dir} 
          onChange={(e) => setSort({ ...sort, dir: e.target.value })}
        >
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
        <Button variant="primary" type="submit">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-filter">
            <polygon points="22 3 2 3 10 12 10 19 14 21 14 12 22 3"></polygon>
          </svg>
          Apply
        </Button>
      </form>

      {/* Blog List */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded shadow-accordion dark:shadow-accordion-dark">
        {isLoading ? (
          <div className="p-6 flex items-center gap-3 text-contentColor dark:text-contentColor-dark">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-primaryColor border-t-transparent animate-spin"></span>
            <span className="text-sm">Loading blogs...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-contentColor dark:text-contentColor-dark">No blogs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-lightGrey5 dark:bg-whiteColor-dark">
                <tr className="text-left">
                  <th className="px-3 py-2 text-blackColor dark:text-blackColor-dark font-semibold">Featured Image</th>
                  <th className="px-3 py-2 text-blackColor dark:text-blackColor-dark font-semibold">Title</th>
                  <th className="px-3 py-2 text-blackColor dark:text-blackColor-dark font-semibold">Scope</th>
                  <th className="px-3 py-2 text-blackColor dark:text-blackColor-dark font-semibold">Author</th>
                  <th className="px-3 py-2 text-blackColor dark:text-blackColor-dark font-semibold">Status</th>
                  <th className="px-3 py-2 text-blackColor dark:text-blackColor-dark font-semibold">Published</th>
                  <th className="px-3 py-2 text-blackColor dark:text-blackColor-dark font-semibold">Created</th>
                  <th className="px-3 py-2 text-blackColor dark:text-blackColor-dark font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((blog) => (
                  <tr key={blog.id} className="border-t border-borderColor dark:border-borderColor-dark">
                    <td className="px-3 py-2">
                      {blog.featured_image_url ? (
                        typeof blog.featured_image_url === 'string' && blog.featured_image_url.startsWith('http') ? (
                          <img
                            src={blog.featured_image_url}
                            alt={blog.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <Image
                            src={blog.featured_image_url}
                            alt={blog.title}
                            width={64}
                            height={64}
                            className="rounded object-cover"
                          />
                        )
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-400">No Image</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-blackColor dark:text-blackColor-dark">{blog.title}</div>
                      {blog.excerpt && (
                        <div className="text-xs text-contentColor dark:text-contentColor-dark mt-1 line-clamp-2">
                          {blog.excerpt.substring(0, 100)}...
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge color={blog.scope === "global" ? "blue" : "amber"}>
                        {blog.scope}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-contentColor dark:text-contentColor-dark">
                      {blog.author?.name || "Unknown"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge 
                        color={
                          blog.status === "published" ? "green" : 
                          blog.status === "draft" ? "amber" : 
                          "gray"
                        }
                      >
                        {blog.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-contentColor dark:text-contentColor-dark text-xs">
                      {formatDate(blog.published_at)}
                    </td>
                    <td className="px-3 py-2 text-contentColor dark:text-contentColor-dark text-xs">
                      {formatDate(blog.created_at)}
                    </td>
                    <td className="px-3 py-2 flex gap-2">
                      <Button 
                        variant="soft" 
                        className="!text-xs !py-1.5 !px-2.5" 
                        href={`${baseListPath}/${blog.id}/edit`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-edit mr-1">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                      </Button>
                      <Button 
                        variant="danger" 
                        className="!text-xs !py-1.5 !px-2.5" 
                        onClick={() => onDelete(blog.id)}
                        disabled={deleteBlog.isPending}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-trash mr-1">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                          <path d="M10 11v6"></path>
                          <path d="M14 11v6"></path>
                        </svg>
                        {deleteBlog.isPending ? 'Deleting...' : 'Delete'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-whiteColor dark:bg-whiteColor-dark rounded shadow-accordion dark:shadow-accordion-dark px-4 py-3">
          <div className="text-sm text-contentColor dark:text-contentColor-dark">
            Page {pagination.page} of {pagination.totalPages || 1} ({pagination.total} results)
          </div>
          <div className="flex gap-2">
            <Button 
              variant="neutral" 
              className="disabled:opacity-50" 
              onClick={() => changePage(pagination.page - 1)} 
              disabled={pagination.page <= 1}
            >
              Prev
            </Button>
            <Button 
              variant="neutral" 
              className="disabled:opacity-50" 
              onClick={() => changePage(pagination.page + 1)} 
              disabled={pagination.page >= (pagination.totalPages || 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
