"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";

/**
 * NoteCard Component
 * 
 * Displays a single note card with basic information.
 * 
 * @param {Object} props
 * @param {Object} props.note - Note object
 * @param {Function} props.onClick - Click handler
 * @param {Function} props.onEdit - Edit handler (optional)
 * @param {Function} props.onDelete - Delete handler (optional)
 */
export default function NoteCard({ note, onClick, onEdit, onDelete }) {
  const noteTypeLabels = {
    general: 'General',
    progress: 'Progress',
    meeting: 'Meeting',
    feedback: 'Feedback',
  };

  const noteTypeColors = {
    general: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    progress: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    meeting: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    feedback: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  };

  const getStudentName = () => {
    if (!note.student) return 'Unknown Student';
    const firstName = note.student.firstName || note.student.first_name || '';
    const lastName = note.student.lastName || note.student.last_name || '';
    return `${firstName} ${lastName}`.trim() || note.student.email || 'Unknown Student';
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
          {note.title && (
            <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-2 truncate">
              {note.title}
            </h3>
          )}
          
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${noteTypeColors[note.noteType] || noteTypeColors.general}`}>
              {noteTypeLabels[note.noteType] || note.noteType}
            </span>
            {note.isPrivate && (
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full">
                Private
              </span>
            )}
          </div>

          <p className="text-sm text-contentColor dark:text-contentColor-dark mb-3 line-clamp-3">
            {note.content}
          </p>

          <div className="flex items-center gap-3 text-xs text-contentColor dark:text-contentColor-dark">
            <span>About: {getStudentName()}</span>
            <span>•</span>
            <span>
              {note.createdAt
                ? formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })
                : ''}
            </span>
          </div>
        </div>

        {/* Actions */}
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-primaryColor hover:bg-primaryColor/10 rounded transition-colors"
                aria-label="Edit note"
              >
                <i className="icofont-edit"></i>
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                aria-label="Delete note"
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
