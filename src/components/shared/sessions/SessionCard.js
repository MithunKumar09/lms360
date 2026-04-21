"use client";

import React from "react";
import { format } from "date-fns";

/**
 * SessionCard Component
 * 
 * Displays a single session card with basic information.
 * 
 * @param {Object} props
 * @param {Object} props.session - Session object
 * @param {Function} props.onClick - Click handler
 * @param {Function} props.onEdit - Edit handler (optional)
 * @param {Function} props.onDelete - Delete handler (optional)
 */
export default function SessionCard({ session, onClick, onEdit, onDelete }) {
  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const sessionTypeLabels = {
    one_on_one: 'One-on-One',
    group: 'Group',
    virtual: 'Virtual',
    in_person: 'In-Person',
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div
      className={`p-4 bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-2 truncate">
            {session.title}
          </h3>
          
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[session.status] || statusColors.scheduled}`}>
              {session.status.replace('_', ' ')}
            </span>
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full">
              {sessionTypeLabels[session.sessionType] || session.sessionType}
            </span>
          </div>

          <div className="space-y-1 text-sm text-contentColor dark:text-contentColor-dark">
            <div className="flex items-center gap-2">
              <i className="icofont-calendar text-primaryColor"></i>
              <span>{formatDateTime(session.scheduledAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="icofont-clock-time text-primaryColor"></i>
              <span>{formatDuration(session.durationMinutes)}</span>
            </div>
            {session.location && (
              <div className="flex items-center gap-2">
                <i className="icofont-location-pin text-primaryColor"></i>
                <span>{session.location}</span>
              </div>
            )}
            {session.meetingLink && (
              <div className="flex items-center gap-2">
                <i className="icofont-video-cam text-primaryColor"></i>
                <a
                  href={session.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-primaryColor hover:underline"
                >
                  Join Meeting
                </a>
              </div>
            )}
            {session.students && session.students.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <i className="icofont-users text-primaryColor"></i>
                <span>{session.students.length} student{session.students.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-primaryColor hover:bg-primaryColor/10 rounded transition-colors"
                aria-label="Edit session"
              >
                <i className="icofont-edit"></i>
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                aria-label="Delete session"
              >
                <i className="icofont-trash"></i>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
