/**
 * Student Blogs Main Component
 * 
 * Main component for student blog management.
 * Manages list and form views for personal blog creation/editing.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import HeroPrimary from '@/components/sections/hero-banners/HeroPrimary';
import StudentBlogsList from '@/components/sections/blogs/StudentBlogsList';
import StudentBlogForm from '@/components/sections/blogs/StudentBlogForm';

export default function StudentBlogsMain() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action');

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingBlog, setEditingBlog] = useState(null);

  // Check URL params on mount and when they change
  useEffect(() => {
    if (action === 'create') {
      setEditingBlog(null);
      setViewMode('create');
    } else {
      setViewMode('list');
      setEditingBlog(null);
    }
  }, [action]);

  const handleCreate = () => {
    setEditingBlog(null);
    setViewMode('create');
  };

  const handleEdit = (blog) => {
    setEditingBlog(blog);
    setViewMode('edit');
  };

  const handleCancel = () => {
    setEditingBlog(null);
    setViewMode('list');
    // Optionally update URL
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/blogs/1');
    }
  };

  const handleSuccess = () => {
    setEditingBlog(null);
    setViewMode('list');
    // Optionally update URL
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/blogs/1');
    }
  };

  const isEditMode = viewMode === 'edit' && editingBlog;

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <>
        <HeroPrimary path="My Blogs" title={isEditMode ? 'Edit Blog' : 'Create New Blog'} />
        <div className="container py-10 md:py-50px lg:py-60px 2xl:py-100px">
          <StudentBlogForm
            blog={editingBlog}
            mode={viewMode}
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <HeroPrimary path="My Blogs" title="My Blogs" />
      <div className="container py-10 md:py-50px lg:py-60px 2xl:py-100px">
        <StudentBlogsList
          onCreate={handleCreate}
          onEdit={handleEdit}
        />
      </div>
    </>
  );
}
