/**
 * Superadmin Blogs Main Component
 * 
 * Main component for superadmin blog management.
 * Manages list and form views for global blog creation/editing.
 */

'use client';

import { useState } from 'react';
import SuperadminBlogsList from '@/components/sections/blogs/SuperadminBlogsList';
import SuperadminBlogForm from '@/components/sections/blogs/SuperadminBlogForm';

export default function SuperadminBlogsMain() {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingBlog, setEditingBlog] = useState(null);

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
  };

  const handleSuccess = () => {
    setEditingBlog(null);
    setViewMode('list');
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <SuperadminBlogForm
        blog={editingBlog}
        mode={viewMode}
        onCancel={handleCancel}
        onSuccess={handleSuccess}
      />
    );
  }

  return (
    <SuperadminBlogsList
      onCreate={handleCreate}
      onEdit={handleEdit}
    />
  );
}
