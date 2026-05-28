//StudentMentorizedGroup
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import Image from "next/image";
import MentorFeedbackModal from "@/components/shared/modals/MentorFeedbackModal";
import TaskList from "@/components/shared/tasks/TaskList";
import TaskDetailsModal from "@/components/shared/modals/TaskDetailsModal";
import ActivityFeed from "@/components/shared/activity-feed/ActivityFeed";

export default function StudentMentorizedGroupMain() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskDetailsModalOpen, setTaskDetailsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Fetch student's mentors
  const { data, isLoading, error } = useQuery({
    queryKey: ['student-mentors'],
    queryFn: async () => {
      const response = await apiClient.get('/students/mentors');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch mentors');
      }
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  });

  const mentors = data?.mentors || [];
  const activityFeed = data?.activityFeed || {
    events: [],
    workshops: [],
    jobPosts: [],
    classroomSessions: [],
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Handle feedback button click
  const handleFeedbackClick = (mentor) => {
    setSelectedMentor({
      id: mentor.id,
      name: `${mentor.first_name || ""} ${mentor.last_name || ""}`.trim() || mentor.email || "Mentor",
    });
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMentor(null);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading mentors...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Error loading mentors: {error.message}</p>
      </div>
    );
  }

  if (mentors.length === 0) {
    return (
      <div className="w-full">
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <h1 className="text-3xl font-bold tracking-tight text-blackColor dark:text-blackColor-dark">Mentorized Group</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-contentColor dark:text-contentColor-dark">
              Your mentor activity center
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-dashed border-borderColor bg-whiteColor px-6 py-16 text-center shadow-sm dark:border-borderColor-dark dark:bg-whiteColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            You don&apos;t have any assigned mentors yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl border border-borderColor bg-whiteColor shadow-sm dark:border-borderColor-dark dark:bg-whiteColor-dark">
        <div className="bg-gradient-to-r from-primaryColor/[0.05] to-transparent p-6 md:p-8 dark:from-primaryColor/[0.08]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-blackColor dark:text-blackColor-dark">Mentorized Group</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-contentColor dark:text-contentColor-dark">
                Your mentor activity center - Connect with mentors and peers
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mentors List */}
      <div className="space-y-8">
        {mentors.map((mentorData, index) => (
          <div
            key={`${mentorData.mentor.id}_${mentorData.cohort?.id || 'no_cohort'}`}
            className="overflow-hidden rounded-3xl border border-borderColor bg-whiteColor shadow-sm transition-all duration-300 hover:border-primaryColor/20 hover:shadow-xl dark:border-borderColor-dark dark:bg-whiteColor-dark"
          >
<div className="p-6 md:p-8">

{/* Mentor Info */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-primaryColor/10 ring-4 ring-primaryColor/5">
                {mentorData.mentor.avatar_url ? (
                  <img
                    src={mentorData.mentor.avatar_url}
                    alt={`${mentorData.mentor.first_name} ${mentorData.mentor.last_name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primaryColor/10 text-3xl font-bold text-primaryColor">
                    {(mentorData.mentor.first_name?.[0] || mentorData.mentor.email?.[0] || "M").toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-5">
                <h2 className="text-2xl font-bold tracking-tight text-blackColor dark:text-blackColor-dark">
                  {`${mentorData.mentor.first_name || ""} ${mentorData.mentor.last_name || ""}`.trim() || mentorData.mentor.email || "Mentor"}
                </h2>
                <p className="text-sm leading-relaxed text-contentColor dark:text-contentColor-dark">
                  {mentorData.mentor.email}
                </p>
                {mentorData.cohort && (
                  <div className="rounded-2xl border border-borderColor bg-lightGrey4/40 p-5 dark:border-borderColor-dark dark:bg-primaryColor/[0.03]">
                    <p className="mb-4 text-base font-bold tracking-tight text-blackColor dark:text-blackColor-dark">
                      Cohort Information
                    </p>
                    <div className="grid grid-cols-1 gap-3 text-sm text-contentColor dark:text-contentColor-dark md:grid-cols-2">
                      <p>
                        <span className="font-semibold">Cohort:</span> {mentorData.cohort.code}
                        {mentorData.cohort.level && ` (Level ${mentorData.cohort.level})`}
                      </p>
                      {mentorData.cohort.program_node && (
                        <p>
                          <span className="font-semibold">Program:</span> {mentorData.cohort.program_node.title}
                          {mentorData.cohort.program_node.code && ` (${mentorData.cohort.program_node.code})`}
                        </p>
                      )}
                      {mentorData.cohort.section && (
                        <p>
                          <span className="font-semibold">Section:</span> {mentorData.cohort.section.name}
                        </p>
                      )}
                      {mentorData.cohort.term && (
                        <p>
                          <span className="font-semibold">{mentorData.cohort.term.type === 'year' ? 'Year' : 'Semester'}:</span> {mentorData.cohort.term.name}
                        </p>
                      )}
                      <p>
                        <span className="font-semibold">Assigned:</span> {formatDate(mentorData.assigned_at)}
                      </p>
                    </div>
                  </div>
                )}
                {/* Feedback Button */}
                <div className="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => handleFeedbackClick(mentorData.mentor)}
                    className="inline-flex items-center justify-center rounded-2xl bg-primaryColor px-5 py-2.5 text-sm font-semibold text-whiteColor shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-primaryColor/90"
                  >
                    Feedback
                  </button>
                </div>
              </div>
            </div>

            {/* Peers Section */}
            {mentorData.peers && mentorData.peers.length > 0 && (
              <div className="mt-8 border-t border-borderColor pt-8 dark:border-borderColor-dark">
                <h3 className="mb-5 text-xl font-bold tracking-tight text-blackColor dark:text-blackColor-dark">
                  Peers in this Group ({mentorData.peers.length})
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {mentorData.peers.map((peer) => (
                    <div
                      key={peer.id}
                      className="flex items-center gap-4 rounded-2xl border border-borderColor bg-lightGrey4/40 p-4 transition-all duration-300 hover:border-primaryColor/20 hover:shadow-md dark:border-borderColor-dark dark:bg-primaryColor/[0.03]"
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primaryColor/10">
                        {peer.avatar_url ? (
                          <img
                            src={peer.avatar_url}
                            alt={`${peer.first_name} ${peer.last_name}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primaryColor/20 text-primaryColor text-sm font-bold">
                            {(peer.first_name?.[0] || peer.email?.[0] || "S").toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-bold text-blackColor dark:text-blackColor-dark">
                          {`${peer.first_name || ""} ${peer.last_name || ""}`.trim() || peer.email}
                        </p>
                        <p className="text-xs text-contentColor dark:text-contentColor-dark truncate">
                          {peer.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Section */}
            <div className="mt-8 border-t border-borderColor pt-8 dark:border-borderColor-dark">
              <h3 className="mb-5 text-xl font-bold tracking-tight text-blackColor dark:text-blackColor-dark">
                Tasks
              </h3>
              <TaskList
                userRole="student"
                filters={{
                  mentor_id: mentorData.mentor.id,
                }}
                onTaskClick={(task) => {
                  setSelectedTask(task);
                  setTaskDetailsModalOpen(true);
                }}
              />
            </div>

            {/* Activity Feed Section */}
            <div className="mt-8 border-t border-borderColor pt-8 dark:border-borderColor-dark">
              <h3 className="mb-5 text-xl font-bold tracking-tight text-blackColor dark:text-blackColor-dark">
                Activity Feed
              </h3>
              <ActivityFeed
                userRole="student"
                filters={{
                  mentor_id: mentorData.mentor.id,
                }}
                pollInterval={30000}
                onActivityClick={(activity) => {
                  // TODO: Handle activity click (e.g., navigate to task details)
                  if (activity.activityData?.task_id) {
                    setSelectedTask({ id: activity.activityData.task_id });
                    setTaskDetailsModalOpen(true);
                  }
                }}
              />
            </div>
          </div>
          </div>
        ))}
      </div>

      {/* Mentor Feedback Modal */}
      <MentorFeedbackModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        mentorId={selectedMentor?.id}
        mentorName={selectedMentor?.name}
      />

      {/* Task Details Modal */}
      <TaskDetailsModal
        isOpen={taskDetailsModalOpen}
        onClose={() => {
          setTaskDetailsModalOpen(false);
          setSelectedTask(null);
        }}
        taskId={selectedTask?.id}
      />
    </div>
  );
}

