"use client";

import React from "react";
import { useMentorSessions } from "@/hooks/api/useMentorSessions";
import SessionCard from "./SessionCard";

/**
 * SessionList Component
 * 
 * Displays a list of sessions with filtering options.
 * 
 * @param {Object} props
 * @param {Object} props.filters - Filter parameters (cohort_id, status, etc.)
 * @param {Function} props.onSessionClick - Handler for session click
 * @param {Function} props.onSessionEdit - Handler for session edit (optional)
 * @param {Function} props.onSessionDelete - Handler for session delete (optional)
 */
export default function SessionList({
  filters = {},
  onSessionClick,
  onSessionEdit,
  onSessionDelete,
}) {
  const { data, isLoading, error } = useMentorSessions({
    filters,
    enabled: true,
  });

  const sessions = data?.sessions || [];

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-contentColor dark:text-contentColor-dark">Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">Error loading sessions: {error.message}</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
        <i className="icofont-calendar text-4xl text-contentColor dark:text-contentColor-dark opacity-50 mb-2"></i>
        <p className="text-contentColor dark:text-contentColor-dark">No sessions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          onClick={onSessionClick ? () => onSessionClick(session) : undefined}
          onEdit={onSessionEdit ? () => onSessionEdit(session) : undefined}
          onDelete={onSessionDelete ? () => onSessionDelete(session) : undefined}
        />
      ))}
    </div>
  );
}
