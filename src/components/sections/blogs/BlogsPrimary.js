"use client";
import blogImag6 from "@/assets/images/blog/blog_6.png";
import blogImag7 from "@/assets/images/blog/blog_7.png";
import blogImag8 from "@/assets/images/blog/blog_8.png";
import blogImag9 from "@/assets/images/blog/blog_9.png";
import BlogPrimary from "@/components/shared/blogs/BlogPrimary";
import BlogsSidebar from "@/components/shared/blogs/BlogsSidebar";
import Pagination from "@/components/shared/others/Pagination";
import AdminBlogForm from "@/components/sections/blogs/AdminBlogForm";
import { useRef, useState, useMemo, useEffect } from "react";
import { useBlogs } from "@/hooks/api/useBlogs";
import { useAuthStore } from "@/store/index.js";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * Format date to day and month
 * @param {string} dateString - ISO date string
 * @returns {Object} { date: string, month: string }
 */
function formatBlogDate(dateString) {
  if (!dateString) {
    return { date: "", month: "" };
  }
  const date = new Date(dateString);
  const day = date.getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  return { date: day.toString(), month };
}

// Fallback images for when blog doesn't have featured image
const fallbackImages = [
  blogImag6,
  blogImag7,
  blogImag8,
  blogImag9,
  blogImag8,
  blogImag7,
  blogImag6,
  blogImag9,
];

const BlogsPrimary = () => {
  const blogsRef = useRef(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const limit = 4;

  // Get user role to determine scope
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;
  const userOrgId = user?.org_id || user?.orgId || null;
  
  // Check if user is admin
  const isAdmin = userRole === 'admin' || userRole === 'orgadmin';

  // Get page from URL params
  const pageFromUrl = searchParams.get('page');
  const page = pageFromUrl ? parseInt(pageFromUrl, 10) : 1;
  
  // Check for action query param (create/edit)
  const action = searchParams.get('action');
  const editId = searchParams.get('edit');
  
  // Determine scope based on user role
  let scope = 'organization'; // Default for /blogs page
  if (userRole === 'superadmin') {
    // Superadmin can see all scopes, but /blogs page shows org blogs by default
    scope = 'organization';
  } else if (userRole === 'admin' || userRole === 'orgadmin') {
    scope = 'organization';
  } else {
    // For non-admin users, show published org blogs
    scope = 'organization';
  }

  // Fetch blogs from API
  const { data, isLoading, isError, error } = useBlogs({
    filters: {
      scope,
      org_id: userOrgId || undefined,
      status: (userRole === 'superadmin' || userRole === 'admin' || userRole === 'orgadmin') ? undefined : 'published',
      page,
      limit,
      sortBy: 'created_at',
      sortDir: 'desc',
    },
    enabled: true, // Always enabled for /blogs page
  });

  // View mode state for admin users
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingBlog, setEditingBlog] = useState(null);
  
  // Handle action query params - must run after data is fetched
  useEffect(() => {
    if (isAdmin && action === 'create') {
      setEditingBlog(null);
      setViewMode('create');
    } else if (isAdmin && editId && data?.blogs) {
      // Find the blog to edit from the fetched blogs
      const blogToEdit = data.blogs.find(b => b.id === editId);
      if (blogToEdit) {
        setEditingBlog(blogToEdit);
        setViewMode('edit');
      } else {
        setViewMode('list');
        setEditingBlog(null);
      }
    } else {
      setViewMode('list');
      setEditingBlog(null);
    }
  }, [action, editId, isAdmin, data]);

  // Transform blogs to component format
  const currentBlogs = useMemo(() => {
    if (!data?.blogs || data.blogs.length === 0) return [];

    return data.blogs.map((blog, idx) => {
      const { date, month } = formatBlogDate(blog.published_at || blog.created_at);

      return {
        id: blog.id,
        title: blog.title,
        desc: blog.excerpt || blog.content?.substring(0, 200) + '...' || '',
        date,
        month,
        image: blog.featured_image_url || fallbackImages[idx % fallbackImages.length],
        author: blog.author || { name: 'Admin' },
        slug: blog.slug,
        blogData: blog, // Include full blog data for editing
      };
    });
  }, [data?.blogs]);
  
  // Handlers for admin blog management
  const handleCreate = () => {
    router.push('/blogs?action=create');
  };
  
  const handleEdit = (blog) => {
    router.push(`/blogs?action=edit&edit=${blog.id}`);
  };
  
  const handleCancel = () => {
    router.push('/blogs');
  };
  
  const handleSuccess = () => {
    router.push('/blogs');
  };

  // Pagination
  const totalBlogs = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 0;
  const paginationItems = [...Array(totalPages)];
  const currentPage = page - 1; // Convert to 0-based index for pagination component

  const handlePagesnation = (id) => {
    blogsRef.current?.scrollIntoView({ behavior: "smooth" });
    let newPage = currentPage;
    
    if (typeof id === "number") {
      newPage = id;
    } else if (id === "prev") {
      newPage = Math.max(0, currentPage - 1);
    } else if (id === "next") {
      newPage = Math.min(totalPages - 1, currentPage + 1);
    }

    // Update URL
    const url = new URL(window.location.href);
    if (newPage === 0) {
      url.searchParams.delete('page');
    } else {
      url.searchParams.set('page', (newPage + 1).toString());
    }
    router.push(url.pathname + url.search, { scroll: false });
  };

  // If admin and in create/edit mode, show form
  if (isAdmin && (viewMode === 'create' || viewMode === 'edit')) {
    return (
      <section>
        <div className="container py-10 md:py-50px lg:py-60px 2xl:py-100px">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-30px">
            <div className="lg:col-start-1 lg:col-span-8">
              <AdminBlogForm
                blog={editingBlog}
                mode={viewMode}
                onCancel={handleCancel}
                onSuccess={handleSuccess}
              />
            </div>
            <div className="lg:col-start-9 lg:col-span-4">
              <BlogsSidebar excludeSections={['categories', 'popular-tag', 'follow-us', 'get-in-touch']} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={blogsRef}>
      <div className="container py-10 md:py-50px lg:py-60px 2xl:py-100px">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-30px">
          {/* blogs */}
          <div className="lg:col-start-1 lg:col-span-8 space-y-[35px]">
            {/* Admin Create Button */}
            {isAdmin && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleCreate}
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
            )}
            {isLoading && (
              <div className="text-center py-20">
                <p className="text-contentColor dark:text-contentColor-dark">Loading blogs...</p>
              </div>
            )}

            {isError && (
              <div className="text-center py-20">
                <p className="text-red-500">
                  {error?.message || 'Failed to load blogs. Please try again later.'}
                </p>
              </div>
            )}

            {!isLoading && !isError && currentBlogs && currentBlogs.length > 0 && (
              <>
                {currentBlogs.map((blog, idx) => (
                  <BlogPrimary 
                    blog={blog} 
                    idx={idx} 
                    key={blog.id || idx}
                    onEdit={handleEdit}
                  />
                ))}
                {/* pagination */}
                {totalPages > 1 && (
                <Pagination
                  pages={paginationItems}
                  totalItems={totalBlogs}
                  handlePagesnation={handlePagesnation}
                  currentPage={currentPage}
                    skip={currentPage * limit}
                  limit={limit}
                />
                )}
              </>
            )}

            {!isLoading && !isError && (!currentBlogs || currentBlogs.length === 0) && (
              <div className="text-center py-20">
                <p className="text-contentColor dark:text-contentColor-dark">
                  No blogs available at the moment.
                </p>
              </div>
            )}
          </div>
          {/* blog sidebar */}
          <div className="lg:col-start-9 lg:col-span-4">
            <BlogsSidebar excludeSections={['categories', 'popular-tag', 'follow-us', 'get-in-touch']} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default BlogsPrimary;
