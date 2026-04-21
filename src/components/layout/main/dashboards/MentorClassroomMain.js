"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import { format } from "date-fns";
import Image from "next/image";
import TaskList from "@/components/shared/tasks/TaskList";
import TaskModal from "@/components/shared/modals/TaskModal";
import TaskDetailsModal from "@/components/shared/modals/TaskDetailsModal";
import ActivityFeed from "@/components/shared/activity-feed/ActivityFeed";
import SessionList from "@/components/shared/sessions/SessionList";
import MaterialList from "@/components/shared/materials/MaterialList";
import NoteList from "@/components/shared/notes/NoteList";
import { useDeleteMentorTask } from "@/hooks/api/useMentorTasks";
import { useDeleteMentorSession } from "@/hooks/api/useMentorSessions";
import { useDeleteMentorMaterial } from "@/hooks/api/useMentorMaterials";
import { useDeleteMentorNote } from "@/hooks/api/useMentorNotes";
import useSweetAlert from "@/hooks/useSweetAlert";
import Swal from "sweetalert2";

export default function MentorClassroomMain() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskDetailsModalOpen, setTaskDetailsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const deleteTask = useDeleteMentorTask();
  const deleteSession = useDeleteMentorSession();
  const deleteMaterial = useDeleteMentorMaterial();
  const deleteNote = useDeleteMentorNote();
  const createAlert = useSweetAlert();

  // Fetch mentor's classroom groups
  const { data: classroomData, isLoading } = useQuery({
    queryKey: ['mentor-classroom'],
    queryFn: async () => {
      const response = await apiClient.get('/mentors/classroom');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch classroom groups');
      }
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // #region agent edit
  const groups = Array.isArray(classroomData?.groups) ? classroomData.groups : [];
  // #endregion

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading classroom groups...</p>
      </div>
    );
  }

  // #region agent edit
  if (!Array.isArray(groups) || groups.length === 0) {
  {/* #endregion */}
    return (
      <div className="w-full">
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <h1 className="h3 mb-2 fw-bold text-dark">Classroom</h1>
            <p className="text-muted mb-0 small">
              Manage your assigned student groups
            </p>
          </div>
        </div>
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            No student groups assigned yet. Contact your admin to get assigned to student cohorts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <h1 className="h3 mb-2 fw-bold text-dark">Classroom</h1>
          <p className="text-muted mb-0 small">
            Manage your assigned student groups by cohort
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* #region agent edit */}
        {Array.isArray(groups) && groups
          .filter(group => group && typeof group === 'object' && group.cohort_id)
          .map((group) => (
            <div
              key={group.cohort_id}
            className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md border-2 border-borderColor dark:border-borderColor-dark p-6"
          >
            {/* Cohort Header */}
            <div className="mb-4 pb-4 border-b-2 border-borderColor dark:border-borderColor-dark">
              <h2 className="text-2xl font-bold text-blackColor dark:text-whiteColor mb-2">
                {/* #region agent edit */}
                {(group.cohort && typeof group.cohort === 'object' && group.cohort.code) || 'Unknown Cohort'}
                {/* #endregion */}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-contentColor dark:text-contentColor-dark">
                {group.program && typeof group.program === 'object' && (
                  <div>
                    <strong>Program:</strong> {group.program.title || group.program.code || 'N/A'}
                  </div>
                )}
                {group.session && typeof group.session === 'object' && (
                  <div>
                    <strong>Session:</strong> {group.session.code || 'N/A'}
                    {group.session.start_date && !isNaN(new Date(group.session.start_date).getTime()) && group.session.end_date && !isNaN(new Date(group.session.end_date).getTime()) && (
                      <span className="ml-1">
                        ({format(new Date(group.session.start_date), 'MMM yyyy')} - {format(new Date(group.session.end_date), 'MMM yyyy')})
                      </span>
                    )}
                  </div>
                )}
                {group.term && typeof group.term === 'object' && (
                  <div>
                    <strong>Term:</strong> {group.term.label || 'N/A'} ({group.term.term_type || 'N/A'})
                  </div>
                )}
                {group.section && typeof group.section === 'object' && (
                  <div>
                    <strong>Section:</strong> {group.section.label || 'N/A'}
                  </div>
                )}
                <div>
                  <strong>Level:</strong> {(group.cohort && typeof group.cohort === 'object' && group.cohort.level) || 'N/A'}
                </div>
                <div>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      (group.cohort && typeof group.cohort === 'object' && group.cohort.status === 'published')
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}
                  >
                    {(group.cohort && typeof group.cohort === 'object' && group.cohort.status) || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            {/* Students List */}
            <div>
              <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor mb-3">
                {/* #region agent edit */}
                Students ({typeof group.student_count === 'number' ? group.student_count : 0})
                {/* #endregion */}
              </h3>
              {Array.isArray(group.students) && group.students.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.students
                    .filter(student => student && typeof student === 'object' && student.student_id)
                    .map((student) => (
                    <div
                      key={student.student_id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-borderColor dark:border-borderColor-dark"
                    >
                      {/* #region agent edit */}
                      {student.avatar_url ? (
                        <Image
                          src={student.avatar_url}
                          alt={`${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student'}
                          width={40}
                          height={40}
                          className="rounded-full"
                          unoptimized
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primaryColor/20 flex items-center justify-center text-primaryColor font-semibold">
                          {((student.first_name && student.first_name[0]) || (student.email && student.email[0]) || '?').toUpperCase()}
                        </div>
                      )}
                      {/* #endregion */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-blackColor dark:text-whiteColor truncate">
                          {/* #region agent edit */}
                          {`${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown Student'}
                          {/* #endregion */}
                        </p>
                        <p className="text-xs text-contentColor dark:text-contentColor-dark truncate">
                          {student.email || 'N/A'}
                        </p>
                        {student.roll_no && (
                          <p className="text-xs text-contentColor dark:text-contentColor-dark">
                            Roll: {student.roll_no}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-contentColor dark:text-contentColor-dark">
                  No students assigned to this cohort.
                </p>
              )}
            </div>

            {/* Tasks Section */}
            <div className="mt-6 pt-4 border-t-2 border-borderColor dark:border-borderColor-dark">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor">
                  Tasks
                </h3>
                <button
                  onClick={() => {
                    setSelectedGroup(group);
                    setSelectedTask(null);
                    setTaskModalOpen(true);
                  }}
                  className="px-4 py-2 text-sm font-medium text-whiteColor bg-primaryColor rounded-md hover:bg-opacity-90 transition-colors"
                >
                  <i className="icofont-plus mr-2"></i>
                  Create Task
                </button>
              </div>
              <TaskList
                userRole="mentor"
                filters={{
                  cohort_id: group.cohort_id,
                }}
                onTaskClick={(task) => {
                  setSelectedTask(task);
                  setTaskDetailsModalOpen(true);
                }}
                onTaskEdit={(task) => {
                  setSelectedTask(task);
                  setSelectedGroup(group);
                  setTaskModalOpen(true);
                }}
                onTaskDelete={async (task) => {
                  const result = await Swal.fire({
                    title: 'Delete Task',
                    text: `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, Delete',
                    cancelButtonText: 'Cancel',
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                  });

                  if (result.isConfirmed) {
                    try {
                      await deleteTask.mutateAsync(task.id);
                    } catch (error) {
                      createAlert('error', error.message || 'Failed to delete task');
                    }
                  }
                }}
              />
            </div>

            {/* Activity Feed Section */}
            <div className="mt-6 pt-4 border-t-2 border-borderColor dark:border-borderColor-dark">
              <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor mb-4">
                Activity Feed
              </h3>
              <ActivityFeed
                userRole="mentor"
                filters={{
                  cohort_id: group.cohort_id,
                }}
                pollInterval={30000}
                onActivityClick={(activity) => {
                  // TODO: Handle activity click (e.g., navigate to task details)
                  if (activity.activityData?.task_id) {
                    console.log('View task from activity:', activity.activityData.task_id);
                  }
                }}
              />
            </div>

            {/* Sessions Section */}
            <div className="mt-6 pt-4 border-t-2 border-borderColor dark:border-borderColor-dark">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor">
                  Sessions
                </h3>
              </div>
              <SessionList
                filters={{
                  cohort_id: group.cohort_id,
                }}
                onSessionClick={(session) => {
                  // TODO: Open session details modal
                  console.log('Session clicked:', session);
                }}
                onSessionEdit={(session) => {
                  // TODO: Open session edit modal
                  console.log('Session edit:', session);
                }}
                onSessionDelete={async (session) => {
                  const result = await Swal.fire({
                    title: 'Delete Session',
                    text: `Are you sure you want to delete "${session.title}"?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, Delete',
                    cancelButtonText: 'Cancel',
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                  });

                  if (result.isConfirmed) {
                    try {
                      await deleteSession.mutateAsync(session.id);
                    } catch (error) {
                      createAlert('error', error.message || 'Failed to delete session');
                    }
                  }
                }}
              />
            </div>

            {/* Materials Section */}
            <div className="mt-6 pt-4 border-t-2 border-borderColor dark:border-borderColor-dark">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor">
                  Materials
                </h3>
              </div>
              <MaterialList
                filters={{
                  cohort_id: group.cohort_id,
                }}
                onMaterialClick={(material) => {
                  // Open material link
                  const url = material.fileUrl || material.externalUrl;
                  if (url) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }
                }}
                onMaterialEdit={(material) => {
                  // TODO: Open material edit modal
                  console.log('Material edit:', material);
                }}
                onMaterialDelete={async (material) => {
                  const result = await Swal.fire({
                    title: 'Delete Material',
                    text: `Are you sure you want to delete "${material.title}"?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, Delete',
                    cancelButtonText: 'Cancel',
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                  });

                  if (result.isConfirmed) {
                    try {
                      await deleteMaterial.mutateAsync(material.id);
                    } catch (error) {
                      createAlert('error', error.message || 'Failed to delete material');
                    }
                  }
                }}
              />
            </div>

            {/* Notes Section */}
            <div className="mt-6 pt-4 border-t-2 border-borderColor dark:border-borderColor-dark">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor">
                  Notes
                </h3>
              </div>
              <NoteList
                filters={{
                  cohort_id: group.cohort_id,
                }}
                onNoteClick={(note) => {
                  // TODO: Open note details modal
                  console.log('Note clicked:', note);
                }}
                onNoteEdit={(note) => {
                  // TODO: Open note edit modal
                  console.log('Note edit:', note);
                }}
                onNoteDelete={async (note) => {
                  const result = await Swal.fire({
                    title: 'Delete Note',
                    text: `Are you sure you want to delete this note?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, Delete',
                    cancelButtonText: 'Cancel',
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                  });

                  if (result.isConfirmed) {
                    try {
                      await deleteNote.mutateAsync(note.id);
                    } catch (error) {
                      createAlert('error', error.message || 'Failed to delete note');
                    }
                  }
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Task Modal */}
      {selectedGroup && (
        <TaskModal
          isOpen={taskModalOpen}
          onClose={() => {
            setTaskModalOpen(false);
            setSelectedTask(null);
            setSelectedGroup(null);
          }}
          task={selectedTask}
          students={(selectedGroup?.students || []).map(s => ({
            id: s.student_id,
            firstName: s.first_name,
            lastName: s.last_name,
            email: s.email,
          }))}
          cohortId={selectedGroup?.cohort_id || null}
        />
      )}

      {/* Task Details Modal */}
      <TaskDetailsModal
        isOpen={taskDetailsModalOpen}
        onClose={() => {
          setTaskDetailsModalOpen(false);
          setSelectedTask(null);
        }}
        taskId={selectedTask?.id}
        onEdit={(task) => {
          setTaskDetailsModalOpen(false);
          setSelectedTask(task);
          const groupForTask = groups.find(g => g.cohort_id === task.cohortId);
          setSelectedGroup(groupForTask || null);
          setTaskModalOpen(true);
        }}
        onDelete={async (task) => {
          const result = await Swal.fire({
            title: 'Delete Task',
            text: `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
          });

          if (result.isConfirmed) {
            try {
              await deleteTask.mutateAsync(task.id);
              setTaskDetailsModalOpen(false);
              setSelectedTask(null);
            } catch (error) {
              createAlert('error', error.message || 'Failed to delete task');
            }
          }
        }}
      />
    </div>
  );
}

