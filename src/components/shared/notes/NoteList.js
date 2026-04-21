"use client";

import React from "react";
import { useMentorNotes } from "@/hooks/api/useMentorNotes";
import NoteCard from "./NoteCard";

/**
 * NoteList Component
 * 
 * Displays a list of notes with filtering options.
 * 
 * @param {Object} props
 * @param {Object} props.filters - Filter parameters (cohort_id, student_id, note_type, etc.)
 * @param {Function} props.onNoteClick - Handler for note click
 * @param {Function} props.onNoteEdit - Handler for note edit (optional)
 * @param {Function} props.onNoteDelete - Handler for note delete (optional)
 */
export default function NoteList({
  filters = {},
  onNoteClick,
  onNoteEdit,
  onNoteDelete,
}) {
  const { data, isLoading, error } = useMentorNotes({
    filters,
    enabled: true,
  });

  const notes = data?.notes || [];

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-contentColor dark:text-contentColor-dark">Loading notes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">Error loading notes: {error.message}</p>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
        <i className="icofont-note text-4xl text-contentColor dark:text-contentColor-dark opacity-50 mb-2"></i>
        <p className="text-contentColor dark:text-contentColor-dark">No notes found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onClick={onNoteClick ? () => onNoteClick(note) : undefined}
          onEdit={onNoteEdit ? () => onNoteEdit(note) : undefined}
          onDelete={onNoteDelete ? () => onNoteDelete(note) : undefined}
        />
      ))}
    </div>
  );
}
