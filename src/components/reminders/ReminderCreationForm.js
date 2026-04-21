"use client";

import React, { useState } from 'react';
import { FiClock, FiMail, FiBell, FiPhone, FiSmartphone } from 'react-icons/fi';
import PrimaryButton from '@/components/quiz/buttons/PrimaryButton';
import SecondaryButton from '@/components/quiz/buttons/SecondaryButton';

const ReminderCreationForm = ({ quizId, quizTitle, prefilledTime = null, onSubmit, onCancel, className = '' }) => {
  const [reminderTime, setReminderTime] = useState(prefilledTime || '');
  const [reminderType, setReminderType] = useState('email');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update reminderTime when prefilledTime changes
  React.useEffect(() => {
    if (prefilledTime) {
      setReminderTime(prefilledTime);
    }
  }, [prefilledTime]);

  const validateForm = () => {
    const newErrors = {};

    // Validate reminder time
    if (!reminderTime) {
      newErrors.reminderTime = 'Reminder time is required';
    } else {
      const selectedTime = new Date(reminderTime);
      const now = new Date();
      if (selectedTime <= now) {
        newErrors.reminderTime = 'Reminder time must be in the future';
      }
    }

    // Validate reminder type
    if (!reminderType) {
      newErrors.reminderType = 'Reminder type is required';
    } else if (!['email', 'push', 'sms', 'in_app'].includes(reminderType)) {
      newErrors.reminderType = 'Invalid reminder type';
    }

    // Validate quiz ID
    if (!quizId) {
      newErrors.quizId = 'Quiz ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        quizId,
        reminderType,
        reminderTime: new Date(reminderTime).toISOString(),
      });
      // Reset form on success
      setReminderTime('');
      setReminderType('email');
      setErrors({});
    } catch (error) {
      console.error('Error submitting reminder form:', error);
      setErrors({ submit: error.message || 'Failed to create reminder' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReminderTypeIcon = (type) => {
    switch (type) {
      case 'email':
        return <FiMail className="text-blue-500" />;
      case 'push':
        return <FiBell className="text-purple-500" />;
      case 'sms':
        return <FiPhone className="text-green-500" />;
      case 'in_app':
        return <FiSmartphone className="text-indigo-500" />;
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {quizTitle && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Quiz: <span className="font-semibold text-blackColor dark:text-blackColor-dark">{quizTitle}</span>
          </p>
        </div>
      )}

      <div>
        <label htmlFor="reminder-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <FiClock className="inline-block mr-1" /> Reminder Time *
        </label>
        <input
          type="datetime-local"
          id="reminder-time"
          value={reminderTime}
          onChange={(e) => {
            setReminderTime(e.target.value);
            if (errors.reminderTime) {
              setErrors((prev) => ({ ...prev, reminderTime: null }));
            }
          }}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor dark:bg-darkdeep1 dark:text-white ${
            errors.reminderTime
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          required
        />
        {errors.reminderTime && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reminderTime}</p>
        )}
      </div>

      <div>
        <label htmlFor="reminder-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Reminder Type *
        </label>
        <div className="space-y-2">
          {['email', 'push', 'sms', 'in_app'].map((type) => (
            <label
              key={type}
              className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${
                reminderType === type
                  ? 'border-primaryColor bg-primaryColor/10 dark:bg-primaryColor/20'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              } ${errors.reminderType ? 'border-red-500' : ''}`}
            >
              <input
                type="radio"
                name="reminder-type"
                value={type}
                checked={reminderType === type}
                onChange={(e) => {
                  setReminderType(e.target.value);
                  if (errors.reminderType) {
                    setErrors((prev) => ({ ...prev, reminderType: null }));
                  }
                }}
                className="sr-only"
              />
              <div className="flex items-center flex-1">
                {getReminderTypeIcon(type)}
                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {type === 'in_app' ? 'In-App Notification' : type === 'push' ? 'Push Notification' : type}
                </span>
              </div>
              {reminderType === type && (
                <div className="w-4 h-4 rounded-full bg-primaryColor flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </label>
          ))}
        </div>
        {errors.reminderType && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reminderType}</p>
        )}
      </div>

      {errors.submit && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-300">{errors.submit}</p>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <SecondaryButton type="button" onClick={onCancel} fullWidth>
            Cancel
          </SecondaryButton>
        )}
        <PrimaryButton type="submit" loading={isSubmitting} fullWidth>
          Set Reminder
        </PrimaryButton>
      </div>
    </form>
  );
};

export default ReminderCreationForm;

