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
            <h1 className="h3 mb-2 fw-bold text-dark">Mentorized Group</h1>
            <p className="text-muted mb-0 small">
              Your mentor activity center
            </p>
          </div>
        </div>
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            You don&apos;t have any assigned mentors yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="h3 mb-2 fw-bold text-dark">Mentorized Group</h1>
              <p className="text-muted mb-0 small">
                Your mentor activity center - Connect with mentors and peers
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mentors List */}
      <div className="space-y-6">
        {mentors.map((mentorData, index) => (
          <div
            key={`${mentorData.mentor.id}_${mentorData.cohort?.id || 'no_cohort'}`}
            className="bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md p-6 hover:shadow-lg transition-shadow"
          >
            {/* Mentor Info */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-darkdeep4 flex-shrink-0 flex items-center justify-center">
                {mentorData.mentor.avatar_url ? (
                  <img
                    src={mentorData.mentor.avatar_url}
                    alt={`${mentorData.mentor.first_name} ${mentorData.mentor.last_name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primaryColor/20 text-primaryColor text-2xl font-bold">
                    {(mentorData.mentor.first_name?.[0] || mentorData.mentor.email?.[0] || "M").toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                  {`${mentorData.mentor.first_name || ""} ${mentorData.mentor.last_name || ""}`.trim() || mentorData.mentor.email || "Mentor"}
                </h2>
                <p className="text-sm text-contentColor dark:text-contentColor-dark mb-2">
                  {mentorData.mentor.email}
                </p>
                {mentorData.cohort && (
                  <div className="mt-3 p-3 bg-darkdeep3 dark:bg-darkdeep3-dark rounded-md">
                    <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-1">
                      Cohort Information
                    </p>
                    <div className="space-y-1 text-sm text-contentColor dark:text-contentColor-dark">
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
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => handleFeedbackClick(mentorData.mentor)}
                    className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium text-sm transition-colors cursor-pointer"
                  >
                    Feedback
                  </button>
                </div>
              </div>
            </div>

            {/* Peers Section */}
            {mentorData.peers && mentorData.peers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-borderColor dark:border-borderColor-dark">
                <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-3">
                  Peers in this Group ({mentorData.peers.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {mentorData.peers.map((peer) => (
                    <div
                      key={peer.id}
                      className="flex items-center gap-3 p-3 bg-darkdeep3 dark:bg-darkdeep3-dark rounded-md"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-darkdeep4 flex-shrink-0 flex items-center justify-center">
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
                        <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark truncate">
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
            <div className="mt-4 pt-4 border-t border-borderColor dark:border-borderColor-dark">
              <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-3">
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
            <div className="mt-4 pt-4 border-t border-borderColor dark:border-borderColor-dark">
              <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-3">
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

