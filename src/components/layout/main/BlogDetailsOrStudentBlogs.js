/**
 * Blog Details or Student Blogs Component
 * 
 * Client component that determines whether to show student blog collection
 * or regular blog details based on route ID and user role.
 */

'use client';

import { useAuthStore } from '@/store/index.js';
import BlogDetailsMain from './BlogDetailsMain';
import StudentBlogsMain from './StudentBlogsMain';

export default function BlogDetailsOrStudentBlogs({ blogId }) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // If id is '1' and user is student, show student blog collection
  // Otherwise show regular blog details
  const isStudentBlogsRoute = blogId === '1' && isAuthenticated && user?.role === 'student';

  if (isStudentBlogsRoute) {
    return <StudentBlogsMain />;
  }

  return <BlogDetailsMain blogId={blogId} />;
}
