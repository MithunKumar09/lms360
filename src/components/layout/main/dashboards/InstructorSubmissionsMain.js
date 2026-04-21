"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import SubmissionsList from "@/components/sections/submissions/SubmissionsList";
import SubmissionDetailView from "@/components/sections/submissions/SubmissionDetailView";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import useCoursesForDropdown from "@/hooks/api/useCoursesForDropdown.js";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown.js";

const InstructorSubmissionsMain = () => {
  const searchParams = useSearchParams();
  const assignmentIdFromUrl = searchParams.get("assignmentId");
  const submissionIdFromUrl = searchParams.get("submissionId");

  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(
    assignmentIdFromUrl || null
  );
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(
    submissionIdFromUrl || null
  );

  // Fetch courses (role-based filtering applied automatically)
  const { data: coursesData, isLoading: isLoadingCourses } = useCoursesForDropdown();
  const courses = Array.isArray(coursesData?.courses) ? coursesData.courses : [];

  const courseOptions = Array.isArray(courses)
    ? courses
        .filter(course => course && typeof course === 'object' && course.id)
        .map((course) => ({
          id: course.id,
          label: course.title || 'Untitled Course',
          value: course.id,
        }))
    : [];

  // Fetch assignments for selected course
  const { data: assignmentsData } = useQuery({
    queryKey: ["assignments", "instructor", { courseId: selectedCourseId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCourseId) params.append("courseId", selectedCourseId);
      const response = await apiClient.get(`/assignments?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch assignments");
      }
      return response;
    },
    enabled: !!selectedCourseId,
  });

  const assignments = Array.isArray(assignmentsData?.assignments) ? assignmentsData.assignments : [];
  const assignmentOptions = selectedCourseId
    ? [
        { id: "none", label: "Select an assignment...", value: null },
        ...(Array.isArray(assignments)
          ? assignments
              .filter(assignment => assignment && typeof assignment === 'object' && assignment.id)
              .map((assignment) => ({
                id: assignment.id,
                label: assignment.title || 'Untitled Assignment',
                value: assignment.id,
              }))
          : []),
      ]
    : [{ id: "none", label: "Select a course first...", value: null }];

  const handleBackToList = () => {
    setSelectedSubmissionId(null);
  };

  if (selectedSubmissionId) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 text-primaryColor hover:text-primaryColor/80 mb-4"
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
            Back to Submissions List
          </button>
          <HeadingDashboard>Review Submission</HeadingDashboard>
        </div>
        <SubmissionDetailView submissionId={selectedSubmissionId} />
      </div>
    );
  }

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <HeadingDashboard>Submissions</HeadingDashboard>

      {/* Course and Assignment Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Select Course
          </label>
          <AdvancedDropdown
            options={courseOptions}
            value={selectedCourseId || "none"}
            onChange={(courseId) => {
              setSelectedCourseId(courseId === "none" ? null : courseId);
              setSelectedAssignmentId(null);
            }}
            placeholder="Select a course..."
            searchable={true}
            loading={isLoadingCourses}
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            Select Assignment
          </label>
          <AdvancedDropdown
            options={assignmentOptions}
            value={selectedAssignmentId || "none"}
            onChange={(assignmentId) => setSelectedAssignmentId(assignmentId === "none" ? null : assignmentId)}
            placeholder="Select an assignment..."
            searchable={true}
            disabled={!selectedCourseId || assignments.length === 0}
          />
        </div>
      </div>

      {/* Submissions List */}
      {selectedAssignmentId ? (
        <SubmissionsList
          assignmentId={selectedAssignmentId}
          onSelectSubmission={setSelectedSubmissionId}
        />
      ) : (
        <div className="text-center py-20 text-gray-500">
          <p>Please select a course and assignment to view submissions</p>
        </div>
      )}
    </div>
  );
};

export default InstructorSubmissionsMain;

