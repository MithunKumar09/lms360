"use client";

import React, { useState } from "react";
import { useVirtualInternship, useVirtualInternshipTasks } from "@/hooks/api/useVirtualInternships";
import { useRouter } from "next/navigation";
import useSweetAlert from "@/hooks/useSweetAlert";
import apiClient from "@/lib/api/client.js";
import { useQueryClient } from "@tanstack/react-query";

const VirtualInternshipDetailMain = ({ programId }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const { program, isLoading: programLoading } = useVirtualInternship(programId);
  const { tasks, isLoading: tasksLoading } = useVirtualInternshipTasks(programId);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleEnroll = async () => {
    if (!programId) return;
    
    setIsEnrolling(true);
    try {
      const response = await apiClient.post(`/virtual-internships/${programId}/enroll`);
      if (response.success) {
        createAlert({
          icon: "success",
          title: "Success!",
          text: "You have successfully enrolled in this program.",
        });
        queryClient.invalidateQueries({ queryKey: ["virtual-internship", programId] });
        queryClient.invalidateQueries({ queryKey: ["virtual-internships"] });
      } else {
        throw new Error(response.error || "Failed to enroll");
      }
    } catch (error) {
      createAlert({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to enroll in program",
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  if (programLoading) {
    return (
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-30px">
        <div className="text-center py-8">
          <p className="text-contentColor dark:text-contentColor-dark">Loading program...</p>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-30px">
        <div className="text-center py-8">
          <p className="text-contentColor dark:text-contentColor-dark">Program not found</p>
          <button
            onClick={() => router.push("/dashboards/student-virtual-internships")}
            className="mt-4 px-4 py-2 bg-primaryColor dark:bg-primaryColor-dark text-whiteColor dark:text-whiteColor-dark rounded hover:opacity-90"
          >
            Back to Programs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-30px">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/dashboards/student-virtual-internships")}
          className="mb-4 flex items-center gap-2 text-primaryColor dark:text-primaryColor-dark hover:opacity-80"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Back to Programs
        </button>
        <h1 className="text-3xl font-bold text-blackColor dark:text-blackColor-dark mb-2">
          {program.title}
        </h1>
        {program.industry && (
          <p className="text-contentColor dark:text-contentColor-dark">Industry: {program.industry}</p>
        )}
      </div>

      {/* Program Details */}
      <div className="mb-6 p-4 border border-borderColor dark:border-borderColor-dark rounded-lg">
        {program.description && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              Description
            </h2>
            <p className="text-contentColor dark:text-contentColor-dark whitespace-pre-wrap">
              {program.description}
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {program.durationWeeks && (
            <div>
              <p className="text-sm text-contentColor dark:text-contentColor-dark">Duration</p>
              <p className="font-semibold text-blackColor dark:text-blackColor-dark">
                {program.durationWeeks} weeks
              </p>
            </div>
          )}
          {program.status && (
            <div>
              <p className="text-sm text-contentColor dark:text-contentColor-dark">Status</p>
              <p className="font-semibold text-blackColor dark:text-blackColor-dark capitalize">
                {program.status}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Enrollment Button */}
      {program.status === "published" && (
        <div className="mb-6">
          <button
            onClick={handleEnroll}
            disabled={isEnrolling}
            className="px-6 py-3 bg-primaryColor dark:bg-primaryColor-dark text-whiteColor dark:text-whiteColor-dark rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEnrolling ? "Enrolling..." : "Enroll in Program"}
          </button>
        </div>
      )}

      {/* Tasks List */}
      {program.status === "published" && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-4">
            Tasks
          </h2>
          {tasksLoading ? (
            <p className="text-contentColor dark:text-contentColor-dark">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="text-contentColor dark:text-contentColor-dark">No tasks available yet.</p>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-borderColor dark:border-borderColor-dark rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboards/student-virtual-internships/${programId}/tasks/${task.id}`)}
                >
                  <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-contentColor dark:text-contentColor-dark mb-3 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  <div className="flex justify-between items-center text-sm text-contentColor dark:text-contentColor-dark">
                    {task.dueDate && (
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    )}
                    {task.maxMarks && <span>Max Marks: {task.maxMarks}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VirtualInternshipDetailMain;