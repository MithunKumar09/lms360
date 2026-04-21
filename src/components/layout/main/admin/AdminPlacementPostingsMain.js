/**
 * Admin Placement Postings Main Component
 * 
 * Full CRUD functionality for managing placement postings
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function AdminPlacementPostingsMain() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPosting, setEditingPosting] = useState(null);
  const [filters, setFilters] = useState({
    postingType: '',
    status: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch postings
  const { data: postingsData, isLoading } = useQuery({
    queryKey: ['admin-postings', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.postingType) params.append('postingType', filters.postingType);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      params.append('page', page);
      params.append('pageSize', pageSize);

      const response = await fetch(`/api/admin/placement/postings?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch postings');
      }
      return response.json();
    }
  });

  // Create posting mutation
  const createPosting = useMutation({
    mutationFn: async (postingData) => {
      const response = await fetch('/api/admin/placement/postings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postingData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create posting');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-postings'] });
      setShowCreateForm(false);
      alert('Posting created successfully');
    }
  });

  // Update posting mutation
  const updatePosting = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/admin/placement/postings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update posting');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-postings'] });
      setEditingPosting(null);
      alert('Posting updated successfully');
    }
  });

  // Delete posting mutation
  const deletePosting = useMutation({
    mutationFn: async (id) => {
      const response = await fetch(`/api/admin/placement/postings/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete posting');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-postings'] });
      alert('Posting deleted successfully');
    }
  });

  const postings = postingsData?.data || [];
  const pagination = postingsData?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this posting? This action cannot be undone.')) {
      return;
    }
    try {
      await deletePosting.mutateAsync(id);
    } catch (error) {
      alert(error.message || 'Failed to delete posting');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Placement Postings</h1>
            <p className="text-gray-600 mt-2">Create and manage job/internship postings</p>
          </div>
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setEditingPosting(null);
            }}
            className="px-4 py-2 bg-primaryColor text-whiteColor rounded-lg hover:bg-primaryColor/90"
          >
            {showCreateForm ? 'Cancel' : '+ Create Posting'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search postings..."
            value={filters.search}
            onChange={(e) => {
              setFilters({ ...filters, search: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={filters.postingType}
            onChange={(e) => {
              setFilters({ ...filters, postingType: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="internship">Internship</option>
            <option value="job">Job</option>
            <option value="contract">Contract</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="expired">Expired</option>
          </select>
          <button
            onClick={() => {
              setFilters({ postingType: '', status: '', search: '' });
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingPosting) && (
        <PostingForm
          posting={editingPosting}
          onSubmit={editingPosting
            ? (data) => updatePosting.mutateAsync({ id: editingPosting.id, data })
            : (data) => createPosting.mutateAsync(data)}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingPosting(null);
          }}
          isSubmitting={createPosting.isPending || updatePosting.isPending}
        />
      )}

      {/* Postings List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Postings ({pagination.total})</h2>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : postings.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No postings found</p>
        ) : (
          <>
            <div className="space-y-4">
              {postings.map((posting) => (
                <PostingRow
                  key={posting.id}
                  posting={posting}
                  onEdit={() => {
                    setEditingPosting(posting);
                    setShowCreateForm(false);
                  }}
                  onDelete={() => handleDelete(posting.id)}
                  onStatusChange={(newStatus) => {
                    updatePosting.mutateAsync({
                      id: posting.id,
                      data: { status: newStatus }
                    });
                  }}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Posting Row Component
function PostingRow({ posting, onEdit, onDelete, onStatusChange }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{posting.title}</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(posting.status)}`}>
              {posting.status}
            </span>
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                posting.postingType === 'internship'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {posting.postingType}
            </span>
          </div>
          <p className="text-gray-700 mb-1">{posting.companyName}</p>
          {posting.location && (
            <p className="text-sm text-gray-600">{posting.location}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Created: {new Date(posting.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={posting.status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="expired">Expired</option>
          </select>
          <button
            onClick={onEdit}
            className="px-3 py-1 text-sm bg-blue-600 text-whiteColor rounded-lg hover:bg-blue-700"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1 text-sm bg-secondaryColor3 text-whiteColor rounded-lg hover:bg-secondaryColor3/90"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Posting Form Component
function PostingForm({ posting, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    title: posting?.title || '',
    companyName: posting?.companyName || '',
    postingType: posting?.postingType || 'internship',
    location: posting?.location || '',
    description: posting?.description || '',
    requirements: posting?.requirements || '',
    responsibilities: posting?.responsibilities || '',
    salaryMin: posting?.salaryMin || '',
    salaryMax: posting?.salaryMax || '',
    salaryCurrency: posting?.salaryCurrency || 'INR',
    salaryDisplay: posting?.salaryDisplay || '',
    requiredSkills: posting?.requiredSkills?.join(', ') || '',
    preferredQualifications: posting?.preferredQualifications || '',
    experienceLevel: posting?.experienceLevel || '',
    applicationDeadline: posting?.applicationDeadline ? new Date(posting.applicationDeadline).toISOString().split('T')[0] : '',
    applicationLink: posting?.applicationLink || '',
    minReadinessScore: posting?.minReadinessScore || '',
    status: posting?.status || 'draft'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      salaryMin: formData.salaryMin ? parseFloat(formData.salaryMin) : null,
      salaryMax: formData.salaryMax ? parseFloat(formData.salaryMax) : null,
      minReadinessScore: formData.minReadinessScore ? parseFloat(formData.minReadinessScore) : null,
      requiredSkills: formData.requiredSkills
        ? formData.requiredSkills.split(',').map(s => s.trim()).filter(s => s)
        : null,
      applicationDeadline: formData.applicationDeadline || null
    };
    onSubmit(data);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {posting ? 'Edit Posting' : 'Create New Posting'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input
              type="text"
              required
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              required
              value={formData.postingType}
              onChange={(e) => setFormData({ ...formData, postingType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="internship">Internship</option>
              <option value="job">Job</option>
              <option value="contract">Contract</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
            <input
              type="text"
              value={formData.experienceLevel}
              onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
              placeholder="e.g., Entry Level, Mid Level, Senior"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salary Min</label>
            <input
              type="number"
              value={formData.salaryMin}
              onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salary Max</label>
            <input
              type="number"
              value={formData.salaryMax}
              onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salary Display</label>
            <input
              type="text"
              value={formData.salaryDisplay}
              onChange={(e) => setFormData({ ...formData, salaryDisplay: e.target.value })}
              placeholder="e.g., ₹5L - ₹10L per annum"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Readiness Score</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.minReadinessScore}
              onChange={(e) => setFormData({ ...formData, minReadinessScore: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Application Deadline</label>
            <input
              type="date"
              value={formData.applicationDeadline}
              onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Application Link</label>
            <input
              type="url"
              value={formData.applicationLink}
              onChange={(e) => setFormData({ ...formData, applicationLink: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
          <textarea
            value={formData.requirements}
            onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities</label>
          <textarea
            value={formData.responsibilities}
            onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Qualifications</label>
          <textarea
            value={formData.preferredQualifications}
            onChange={(e) => setFormData({ ...formData, preferredQualifications: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills (comma-separated)</label>
          <input
            type="text"
            value={formData.requiredSkills}
            onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
            placeholder="e.g., JavaScript, React, Node.js"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-primaryColor text-whiteColor rounded-lg hover:bg-primaryColor/90 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : posting ? 'Update Posting' : 'Create Posting'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
