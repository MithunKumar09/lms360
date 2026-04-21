"use client";

import React from 'react';
import { useAuthStore } from '@/store';
import ReminderCard from './ReminderCard';
import { useReminders } from '@/hooks/api/useReminders';
import QuizLoadingSpinner from '@/components/quiz/states/QuizLoadingSpinner';
import QuizListEmptyState from '@/components/quiz/states/QuizListEmptyState';
import { FiBell } from 'react-icons/fi';

const ReminderList = ({ 
  studentId = null, 
  quizId = null,
  onEdit,
  onDelete,
  showEmptyState = true,
  className = '' 
}) => {
  const user = useAuthStore((state) => state.user);
  const targetStudentId = studentId || user?.id;

  const { data, isLoading, error, refetch } = useReminders({
    studentId: targetStudentId,
    quizId,
    enabled: !!targetStudentId,
  });

  const reminders = data?.reminders || [];

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-32 ${className}`}>
        <QuizLoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-500 dark:text-red-400 mb-4">
          Error loading reminders: {error.message}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (reminders.length === 0 && showEmptyState) {
    return (
      <QuizListEmptyState
        message="No reminders set. Create one to get notified about your quizzes."
        icon={FiBell}
      />
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {reminders.map((reminder) => (
        <ReminderCard
          key={reminder.id}
          reminder={reminder}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};

export default ReminderList;

