"use client";

import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import IconButton from '@/components/quiz/buttons/IconButton';
import ReminderCreationForm from './ReminderCreationForm';
import useSweetAlert from '@/hooks/useSweetAlert';
import apiClient from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';

const SetReminderModal = ({ isOpen, onClose, quizId, quizTitle, prefilledTime = null, onReminderSet, className = '' }) => {
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (formData) => {
    if (!quizId) {
      createAlert({
        icon: 'error',
        title: 'Validation Error',
        text: 'Quiz ID is required.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.post('/quiz-reminders', {
        quizId,
        reminderType: formData.reminderType,
        reminderTime: formData.reminderTime,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create reminder');
      }

      // Invalidate reminders query to refresh the list
      queryClient.invalidateQueries({
  queryKey: ['quiz-reminders', quizId],
});

      createAlert({
        icon: 'success',
        title: 'Reminder Set!',
        text: 'Your reminder has been successfully created.',
      });

      if (onReminderSet) {
        onReminderSet(response.reminder);
      }

      onClose();
    } catch (error) {
      console.error('Error creating reminder:', error);
      createAlert({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to create reminder. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 ${className}`}>
      <div className="bg-whiteColor dark:bg-darkdeep3-dark rounded-lg shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Set Reminder
          </h2>
          <IconButton
            icon={FiX}
            onClick={handleClose}
            variant="outline"
            size="sm"
            ariaLabel="Close modal"
          />
        </div>

        <ReminderCreationForm
          quizId={quizId}
          quizTitle={quizTitle}
          prefilledTime={prefilledTime}
          onSubmit={handleSubmit}
          onCancel={handleClose}
        />
      </div>
    </div>
  );
};

export default SetReminderModal;

