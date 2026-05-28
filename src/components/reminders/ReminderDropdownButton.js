"use client";

import React, { useState, useRef, useEffect } from 'react';
import { FiBell, FiChevronDown } from 'react-icons/fi';
import IconButton from '@/components/quiz/buttons/IconButton';
import { addDays, subHours, format } from 'date-fns';

const ReminderDropdownButton = ({ quiz, onReminderSet, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('pointerdown', handleClickOutside, {
  passive: true,
});
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!quiz || !quiz.id) return null;

  const handleQuickSet = (type) => {
    let reminderTime;
    const now = new Date();

    switch (type) {
      case 'tomorrow':
        // Set for tomorrow at 9 AM
        reminderTime = addDays(now, 1);
        reminderTime.setHours(9, 0, 0, 0);
        break;
      case 'one-hour-before':
        // Set for 1 hour before quiz start (if start_date exists)
        if (quiz.startDate) {
          const startDate = new Date(quiz.startDate);
          reminderTime = subHours(startDate, 1);
          // If 1 hour before is in the past, set for tomorrow instead
          if (reminderTime <= now) {
            reminderTime = addDays(now, 1);
            reminderTime.setHours(9, 0, 0, 0);
          }
        } else {
          // No start date, set for tomorrow
          reminderTime = addDays(now, 1);
          reminderTime.setHours(9, 0, 0, 0);
        }
        break;
      case 'custom':
        // Open modal with no pre-filled time
        if (onReminderSet) {
          onReminderSet(quiz.id, quiz.title, null);
        }
        setIsOpen(false);
        return;
      default:
        return;
    }

    // Format time for datetime-local input (YYYY-MM-DDTHH:mm)
    const formattedTime = format(reminderTime, "yyyy-MM-dd'T'HH:mm");

    if (onReminderSet) {
      onReminderSet(quiz.id, quiz.title, formattedTime);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <IconButton
        icon={FiBell}
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        ariaLabel="Set reminder"
        className="relative"
      />
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-whiteColor dark:bg-darkdeep3-dark rounded-md shadow-lg border border-borderColor dark:border-borderColor-dark z-50">
          <div className="py-1">
            <button
              onClick={() => handleQuickSet('tomorrow')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <FiBell className="text-primaryColor" />
              <span>Set Reminder for Tomorrow</span>
            </button>
            {quiz.startDate && (
              <button
                onClick={() => handleQuickSet('one-hour-before')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <FiBell className="text-primaryColor" />
                <span>Set Reminder 1 Hour Before</span>
              </button>
            )}
            <button
              onClick={() => handleQuickSet('custom')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-t border-borderColor dark:border-borderColor-dark"
            >
              <FiChevronDown className="text-primaryColor" />
              <span>Custom Reminder</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReminderDropdownButton;

