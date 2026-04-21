"use client";

import React from 'react';
import { FiClock, FiTrash2, FiMail, FiBell, FiPhone, FiSmartphone } from 'react-icons/fi';
import IconButton from '@/components/quiz/buttons/IconButton';
import { formatDistanceToNowStrict, parseISO, format } from 'date-fns';

const ReminderCard = ({ reminder, onDelete, onEdit, className = '' }) => {
  if (!reminder) return null;

  const { id, quizTitle, reminderTime, reminderType, isSent, sentAt } = reminder;

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
        return <FiBell className="text-gray-500" />;
    }
  };

  const getReminderTypeLabel = (type) => {
    switch (type) {
      case 'email':
        return 'Email';
      case 'push':
        return 'Push Notification';
      case 'sms':
        return 'SMS';
      case 'in_app':
        return 'In-App';
      default:
        return 'Unknown';
    }
  };

  const formatReminderTime = (time) => {
    try {
      const date = parseISO(time);
      return formatDistanceToNowStrict(date, { addSuffix: true });
    } catch (error) {
      return time;
    }
  };

  const formatReminderTimeFull = (time) => {
    try {
      const date = parseISO(time);
      return format(date, 'MMM dd, yyyy hh:mm a');
    } catch (error) {
      return time;
    }
  };

  return (
    <div className={`p-4 bg-whiteColor dark:bg-darkdeep3-dark shadow-lg rounded-lg border border-borderColor dark:border-borderColor-dark ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-2">
            {quizTitle || 'Untitled Quiz'}
          </h4>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
            <div className="flex items-center gap-1" title={formatReminderTimeFull(reminderTime)}>
              <FiClock className="text-primaryColor" />
              <span>{formatReminderTime(reminderTime)}</span>
            </div>
            <div className="flex items-center gap-1">
              {getReminderTypeIcon(reminderType)}
              <span>{getReminderTypeLabel(reminderType)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSent ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                Sent
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                Scheduled
              </span>
            )}
            {sentAt && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Sent: {formatReminderTime(sentAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {onEdit && !isSent && (
            <IconButton
              icon={FiClock}
              onClick={() => onEdit(reminder)}
              variant="outline"
              size="sm"
              ariaLabel="Edit reminder"
            />
          )}
          {onDelete && (
            <IconButton
              icon={FiTrash2}
              onClick={() => onDelete(id)}
              variant="danger"
              size="sm"
              ariaLabel="Delete reminder"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ReminderCard;

