/**
 * QuizzesGridWrapper Component
 * 
 * Wraps QuizGrid with data fetching and filter logic from QuizzesTable
 * Provides role-based action handlers
 */

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client.js';
import useCoursesForDropdown from '@/hooks/api/useCoursesForDropdown.js';
import useSweetAlert from '@/hooks/useSweetAlert';
import QuizGrid from '@/components/quiz/QuizGrid.js';
import QuizReportPreviewModal from '@/components/reports/QuizReportPreviewModal';
import QuizDuplicateModal from '@/components/manage/QuizDuplicateModal';
import QuizPreviewModal from '@/components/manage/QuizPreviewModal';
import { useAuthStore } from '@/store/index.js';

const QuizzesGridWrapper = ({ role = 'instructor' }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const user = useAuthStore((state) => state.user);

  // Filters
  const [filters, setFilters] = useState({
    courseId: null,
    orgId: null, // Only for superadmin
    status: null,
    quizType: null,
    startDate: null,
    endDate: null,
    page: 1,
    limit: 20,
  });

  // Search
  const [searchValue, setSearchValue] = useState('');
  const [sortValue, setSortValue] = useState('newest');

  // Fetch quizzes
  const { data, isLoading, error } = useQuery({
    queryKey: ['quizzes', role, filters, searchValue, sortValue],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
      });
      if (filters.courseId && filters.courseId !== 'standalone') {
        params.append('courseId', filters.courseId);
      }
      // Note: For standalone quizzes, we'll filter on frontend (courseId is null)
      if (filters.orgId && role === 'superadmin' && filters.orgId !== 'global') {
        params.append('orgId', filters.orgId);
      }
      if (filters.status) params.append('status', filters.status);
      if (filters.quizType) params.append('quizType', filters.quizType);
      if (searchValue) params.append('search', searchValue);
      if (sortValue) params.append('sort', sortValue);

      const response = await apiClient.get(`/quizzes?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch quizzes');
      }
      return response;
    },
  });

  // Fetch organizations for superadmin filter
  const { data: orgsData } = useQuery({
    queryKey: ['organizations', 'list'],
    queryFn: async () => {
      const response = await apiClient.get('/organizations');
      return response.organizations || [];
    },
    enabled: role === 'superadmin',
    staleTime: 5 * 60 * 1000,
  });
  const organizations = orgsData || [];

  // Fetch courses for filter
  const { data: coursesData } = useCoursesForDropdown();
  const courses = coursesData?.courses || [];

  let quizzes = data?.quizzes || [];
  // Filter standalone quizzes if filter is set
  if (filters.courseId === 'standalone') {
    quizzes = quizzes.filter((q) => q.courseId === null);
  }
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/quizzes/${id}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete quiz');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      createAlert({
        icon: 'success',
        title: 'Success!',
        text: 'Quiz deleted successfully',
      });
    },
    onError: (error) => {
      createAlert({
        icon: 'error',
        title: 'Error!',
        text: error.message || 'Failed to delete quiz',
      });
    },
  });

  const handleDelete = (id, title) => {
    createAlert({
      icon: 'warning',
      title: 'Are you sure?',
      text: `Do you want to delete "${title}"? This action cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(id);
      }
    });
  };

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page on filter change
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleSearch = (value) => {
    setSearchValue(value);
    setFilters((prev) => ({ ...prev, page: 1 })); // Reset to first page on search
  };

  const handleSortChange = (value) => {
    setSortValue(value);
  };

  const getDashboardPath = () => {
    if (role === 'superadmin') return '/dashboards/superadmin-add-quiz';
    if (role === 'admin') return '/dashboards/admin-add-quiz';
    return '/dashboards/instructor-add-quiz';
  };

  const getManagePath = () => {
    if (role === 'superadmin') return '/dashboards/superadmin-submissions';
    if (role === 'admin') return '/dashboards/admin-submissions';
    return '/dashboards/instructor-submissions';
  };

  const handleEdit = (id) => {
    router.push(`${getDashboardPath()}?id=${id}`);
  };

  const handlePreview = (id) => {
    setSelectedQuizForPreview(id);
    setShowPreviewModal(true);
  };

  const handleViewAttempts = (id) => {
    router.push(`${getManagePath()}?quizId=${id}`);
  };

  const handleDuplicate = (id) => {
    setSelectedQuizForDuplicate(id);
    setShowDuplicateModal(true);
  };

  const [selectedQuizForReport, setSelectedQuizForReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedQuizForDuplicate, setSelectedQuizForDuplicate] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [selectedQuizForPreview, setSelectedQuizForPreview] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handleGenerateReport = (id) => {
    setSelectedQuizForReport(id);
    setShowReportModal(true);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-red-500">Error: {error.message}</p>
      </div>
    );
  }

  // Action handlers for QuizCard
  const actionHandlers = {
    onEdit: handleEdit,
    onDelete: handleDelete,
    onPreview: handlePreview,
    onViewAttempts: handleViewAttempts,
    onDuplicate: handleDuplicate,
    onGenerateReport: handleGenerateReport,
  };

  return (
    <>
    <QuizGrid
      quizzes={quizzes}
      isLoading={isLoading}
      onSearch={handleSearch}
      onFilterChange={handleFilterChange}
      onSortChange={handleSortChange}
      onPaginate={handlePageChange}
      paginationMode="pagination"
      pagination={pagination}
      hasMore={pagination.page < pagination.totalPages}
      role={role}
      searchValue={searchValue}
      sortValue={sortValue}
      filters={filters}
      actionHandlers={actionHandlers}
    />
    {showReportModal && selectedQuizForReport && (
      <QuizReportPreviewModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedQuizForReport(null);
        }}
        quizId={selectedQuizForReport}
        reportType={role}
      />
    )}
    {showDuplicateModal && selectedQuizForDuplicate && (
      <QuizDuplicateModal
        isOpen={showDuplicateModal}
        onClose={() => {
          setShowDuplicateModal(false);
          setSelectedQuizForDuplicate(null);
        }}
        quizId={selectedQuizForDuplicate}
        role={role}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['quizzes'] });
        }}
      />
    )}
    {showPreviewModal && selectedQuizForPreview && (
      <QuizPreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setSelectedQuizForPreview(null);
        }}
        quizId={selectedQuizForPreview}
      />
    )}
  </>
  );
};

export default QuizzesGridWrapper;

