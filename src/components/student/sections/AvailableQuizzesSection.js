//student/sections/AvailableQuizzesSection.js
"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import QuizGrid from '@/components/quiz/QuizGrid';
import useStudentQuizzes from '@/hooks/api/useStudentQuizzes';
import { useAuthStore } from '@/store';
import SetReminderModal from '@/components/reminders/SetReminderModal';

const AvailableQuizzesSection = ({ className = '' }) => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [selectedQuizForReminder, setSelectedQuizForReminder] = useState(null);
  const [prefilledReminderTime, setPrefilledReminderTime] = useState(null);

  const [filters, setFilters] = useState({
    courseId: null,
    quizType: null,
    status: 'published',
    search: '',
    sort: 'newest',
    page: 1,
    limit: 12,
  });

  const { data, isLoading, error } = useStudentQuizzes({
    courseId: filters.courseId,
    quizType: filters.quizType,
    status: filters.status,
    search: filters.search,
    sort: filters.sort,
    page: filters.page,
    limit: filters.limit,
  });

  const quizzes = data?.quizzes || [];
  const pagination = data?.pagination || { page: 1, limit: filters.limit, total: 0, totalPages: 0 };

  const handleSearch = useCallback((searchTerm) => {
    setFilters((prev) => ({
      ...prev,
      search: searchTerm,
      page: 1,
    }));
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1,
    }));
  }, []);

  const handleSortChange = useCallback((sortValue) => {
    setFilters((prev) => ({
      ...prev,
      sort: sortValue,
      page: 1,
    }));
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  }, []);

  const handleAttemptQuiz = useCallback((quizId) => {
    router.push(`/student/quiz-attempt/${quizId}`);
  }, [router]);

  const handleViewQuiz = useCallback((quizId) => {
    router.push(`/quizzes/${quizId}`);
  }, [router]);

  const handlePreviewQuiz = useCallback((quizId) => {
    router.push(`/quizzes/${quizId}/preview`);
  }, [router]);

  const handleReminderSet = useCallback((quizId, quizTitle, prefilledTime = null) => {
    const quiz = quizzes.find((q) => q.id === quizId);
    setSelectedQuizForReminder({ id: quizId, title: quizTitle || quiz?.title });
    setPrefilledReminderTime(prefilledTime);
    setIsReminderModalOpen(true);
  }, [quizzes]);

  const handleCloseReminderModal = useCallback(() => {
    setIsReminderModalOpen(false);
    setSelectedQuizForReminder(null);
    setPrefilledReminderTime(null);
  }, []);

  const actionHandlers = useMemo(() => ({
  onAttempt: handleAttemptQuiz,
  onView: handleViewQuiz,
  onPreview: handlePreviewQuiz,
  onReminderSet: handleReminderSet,
}), [
  handleAttemptQuiz,
  handleViewQuiz,
  handlePreviewQuiz,
  handleReminderSet,
]);

  return (
    <div className={`mb-8 ${className}`}>
      <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-6">
        Available Quizzes
      </h2>
      <QuizGrid
        quizzes={quizzes}
        isLoading={isLoading}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onPaginate={handlePageChange}
        pagination={pagination}
        role="student"
        searchValue={filters.search}
        sortValue={filters.sort}
        filters={filters}
        actionHandlers={actionHandlers}
        context="student-view"
      />

      <SetReminderModal
        isOpen={isReminderModalOpen}
        onClose={handleCloseReminderModal}
        quizId={selectedQuizForReminder?.id}
        quizTitle={selectedQuizForReminder?.title}
        prefilledTime={prefilledReminderTime}
      />
    </div>
  );
};

export default AvailableQuizzesSection;

