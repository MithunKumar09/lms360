"use client";

import React, { useState } from 'react';
import { FiBell, FiPlus } from 'react-icons/fi';
import { useAuthStore } from '@/store';
import ReminderList from '@/components/reminders/ReminderList';
import SetReminderModal from '@/components/reminders/SetReminderModal';
import { useDeleteReminder } from '@/hooks/api/useReminders';
import PrimaryButton from '@/components/quiz/buttons/PrimaryButton';

const RemindersSection = ({ className = '' }) => {
  const user = useAuthStore((state) => state.user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [selectedQuizTitle, setSelectedQuizTitle] = useState(null);
  const [prefilledTime, setPrefilledTime] = useState(null);

  const deleteReminderMutation = useDeleteReminder();

  const handleDeleteReminder = async (reminderId) => {
    deleteReminderMutation.mutate(reminderId);
  };

  const handleSetReminder = (quizId = null, quizTitle = null, prefilledReminderTime = null) => {
    setSelectedQuizId(quizId);
    setSelectedQuizTitle(quizTitle);
    setPrefilledTime(prefilledReminderTime);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedQuizId(null);
    setSelectedQuizTitle(null);
    setPrefilledTime(null);
  };

  const handleReminderSet = () => {
    // Called when reminder is successfully created
    handleCloseModal();
  };

  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
          Your Quiz Reminders
        </h2>
        <PrimaryButton
          onClick={() => handleSetReminder()}
          icon={FiPlus}
          size="sm"
        >
          Set New Reminder
        </PrimaryButton>
      </div>

      <ReminderList
        studentId={user?.id}
        onDelete={handleDeleteReminder}
        onEdit={(reminder) => handleSetReminder(reminder.quizId, reminder.quizTitle)}
      />

      <SetReminderModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        quizId={selectedQuizId}
        quizTitle={selectedQuizTitle}
        prefilledTime={prefilledTime}
        onReminderSet={handleReminderSet}
      />
    </div>
  );
};

export default RemindersSection;

