"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import AssignmentDetailsCarousel from "./AssignmentDetailsCarousel";
import { useStudentAssignmentDetails } from "@/hooks/api/useStudentAssignmentDetails";
import { formatDateShort } from "@/lib/utils/dateFormatter";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";

const StudentAssignmentDetailsPrimary = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const assignmentId = searchParams.get("assignmentId");
  const viewMode = searchParams.get("view") === "true";

  // Fetch assignment details
  const { data, isLoading, error } = useStudentAssignmentDetails(assignmentId);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <SkeletonLoader type="card" className="h-96" />
      </div>
    );
  }

  // Error state
  if (error || !data?.assignment) {
    // Safely extract error message
    const errorMessage = error 
      ? (error instanceof Error 
          ? error.message 
          : typeof error === 'string' 
          ? error 
          : error?.message || 'Assignment not found')
      : 'Assignment not found';
    
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="text-center py-20">
          <p className="text-lg text-contentColor dark:text-contentColor-dark">
            {errorMessage}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const assignment = data.assignment;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isDeadlinePassed = assignment.deadline ? new Date(assignment.deadline) < new Date() : false;
  const submission = assignment.submission;
  const isSubmitted = !!submission;
  const isGraded = submission?.status === 'graded';
  
  // Determine if "Attach Assignment" button should be shown
  const showAttachButton = !viewMode && (!isSubmitted || (isSubmitted && !isGraded));

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-contentColor dark:text-contentColor-dark hover:text-primaryColor transition-colors"
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
            <span className="font-medium">Back to Assignments</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
            isDeadlinePassed
              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
              : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
          }`}>
            {isDeadlinePassed ? "Deadline Passed" : "Active"}
          </span>
        </div>
      </div>

      {/* Assignment Title */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-blackColor dark:text-blackColor-dark mb-3">
          {assignment.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-contentColor dark:text-contentColor-dark">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <span className="font-medium">{assignment.courseName || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* Key Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded-lg p-4 border border-borderColor dark:border-borderColor-dark">
          <div className="flex items-center gap-2 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primaryColor"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <span className="text-xs font-medium text-contentColor dark:text-contentColor-dark">Total Marks</span>
          </div>
          <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">{assignment.maxMarks}</p>
        </div>

        <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded-lg p-4 border border-borderColor dark:border-borderColor-dark">
          <div className="flex items-center gap-2 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-600 dark:text-green-400"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span className="text-xs font-medium text-contentColor dark:text-contentColor-dark">Passing Marks</span>
          </div>
          <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">{assignment.passingMarks}</p>
        </div>

        <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded-lg p-4 border border-borderColor dark:border-borderColor-dark">
          <div className="flex items-center gap-2 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-orange-600 dark:text-orange-400"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span className="text-xs font-medium text-contentColor dark:text-contentColor-dark">Deadline</span>
          </div>
          <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
            {formatDate(assignment.deadline)}
          </p>
        </div>

        <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded-lg p-4 border border-borderColor dark:border-borderColor-dark">
          <div className="flex items-center gap-2 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-600 dark:text-blue-400"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span className="text-xs font-medium text-contentColor dark:text-contentColor-dark">Max File Size</span>
          </div>
          <p className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">{assignment.maxFileSizeMb} MB</p>
        </div>
      </div>

      {/* Attachments Carousel */}
      {assignment.assignmentAttachments && assignment.assignmentAttachments.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark mb-4 flex items-center gap-2">
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Assignment Materials
          </h2>
          <AssignmentDetailsCarousel files={assignment.assignmentAttachments.map(att => ({
            id: att.id,
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileType: att.fileType,
          }))} />
        </div>
      )}

      {/* Submission Status Section */}
      {isSubmitted && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark mb-4 flex items-center gap-2">
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            Your Submission
          </h2>
          <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded-lg p-5 border border-borderColor dark:border-borderColor-dark">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-contentColor dark:text-contentColor-dark">Submitted on</p>
                  <p className="font-semibold text-blackColor dark:text-blackColor-dark">
                    {submission.submittedAt ? formatDate(submission.submittedAt) : "N/A"}
                  </p>
                </div>
                {submission.isLate && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                    Late Submission
                  </span>
                )}
              </div>

              {submission.files && submission.files.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
                    Submitted Files ({submission.files.length})
                  </p>
                  <div className="space-y-2">
                    {submission.files.map((file) => (
                      <a
                        key={file.id}
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-whiteColor dark:bg-whiteColor-dark rounded border border-borderColor dark:border-borderColor-dark hover:bg-lightGrey5 dark:hover:bg-darkdeep1 transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <span className="text-sm text-contentColor dark:text-contentColor-dark">{file.fileName}</span>
                        <span className="text-xs text-contentColor dark:text-contentColor-dark ml-auto">
                          {(file.fileSizeBytes / 1024).toFixed(2)} KB
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {isGraded && (
                <div className="pt-4 border-t border-borderColor dark:border-borderColor-dark">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Marks Obtained</p>
                      <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
                        {submission.marksObtained !== null && submission.marksObtained !== undefined
                          ? `${submission.marksObtained} / ${assignment.maxMarks}`
                          : "Not graded"}
                      </p>
                    </div>
                    {submission.feedback && (
                      <div>
                        <p className="text-sm text-contentColor dark:text-contentColor-dark mb-1">Instructor Feedback</p>
                        <p className="text-sm text-blackColor dark:text-blackColor-dark whitespace-pre-line">
                          {submission.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Review Button - Only show in view mode */}
              {viewMode && (
                <div className="pt-4 border-t border-borderColor dark:border-borderColor-dark">
                  <button
                    onClick={() => {
                      router.push(`/dashboards/student-subm?submissionId=${submission.id}&assignmentId=${assignmentId || assignment.id}`);
                    }}
                    className="w-full md:w-auto px-8 py-3.5 bg-primaryColor hover:bg-primaryColor/90 text-whiteColor font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Review
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Description Section */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark mb-3 flex items-center gap-2">
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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          Description
        </h2>
        <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded-lg p-5 border border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark leading-relaxed whitespace-pre-line">
            {assignment.description}
          </p>
        </div>
      </div>

      {/* Instructions Section */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark mb-3 flex items-center gap-2">
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
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Instructions
        </h2>
        <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded-lg p-5 border border-borderColor dark:border-borderColor-dark">
          <div className="text-contentColor dark:text-contentColor-dark leading-relaxed whitespace-pre-line">
            {assignment.instructions}
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="mb-6">
        <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded-lg p-5 border border-borderColor dark:border-borderColor-dark">
          <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-3 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            File Requirements
          </h3>
          <ul className="space-y-2 text-contentColor dark:text-contentColor-dark">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primaryColor rounded-full"></span>
              <span>Max size: {assignment.maxFileSizeMb || 10} MB</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primaryColor rounded-full"></span>
              <span>Allowed types: {(assignment.allowedFileTypes || []).map(t => t.toUpperCase()).join(", ") || "All"}</span>
            </li>
            {assignment.allowLateSubmission && (
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                <span>Late submission allowed {assignment.lateSubmissionPenalty ? `(Penalty: ${assignment.lateSubmissionPenalty}%)` : ''}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Submit Assignment Button - Only show if not in view mode and (not submitted or can edit) */}
      {showAttachButton && (
        <div className="border-t border-borderColor dark:border-borderColor-dark pt-6">
          <button
            onClick={() => {
              const editParam = isSubmitted ? "&edit=true" : "";
              router.push(`/dashboards/attache-assignment?assignmentId=${assignmentId || assignment.id}${editParam}`);
            }}
            className="w-full md:w-auto px-8 py-3.5 bg-primaryColor hover:bg-primaryColor/90 text-whiteColor font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            {isSubmitted ? "Edit Submission" : "Attach Assignment"}
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentAssignmentDetailsPrimary;

