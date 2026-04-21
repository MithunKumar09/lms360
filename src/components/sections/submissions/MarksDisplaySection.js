"use client";

import React from "react";

const MarksDisplaySection = ({ submission }) => {
  if (!submission) return null;

  const marksObtained = submission.marksObtained;
  const maxMarks = submission.maxMarks;
  const passingMarks = submission.passingMarks;
  const feedback = submission.feedback;
  const status = submission.status;
  const gradedAt = submission.gradedAt;
  const gradedBy = submission.gradedBy;

  // Calculate percentage
  const percentage = marksObtained !== null && marksObtained !== undefined && maxMarks > 0
    ? ((marksObtained / maxMarks) * 100).toFixed(1)
    : null;

  // Determine pass/fail
  const hasPassed = marksObtained !== null && marksObtained !== undefined && passingMarks !== null
    ? marksObtained >= passingMarks
    : null;

  // Status badge colors
  const getStatusBadge = (status) => {
    switch (status) {
      case 'graded':
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
      case 'submitted':
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      case 'returned':
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400";
    }
  };

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

  return (
    <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark p-6 space-y-6">
      <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
        Grading Results
      </h3>

      {/* Main Marks Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Marks Obtained Card */}
        <div className="bg-gradient-to-br from-primaryColor/10 to-primaryColor/5 dark:from-primaryColor/20 dark:to-primaryColor/10 rounded-lg p-6 border-2 border-primaryColor/20 dark:border-primaryColor/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primaryColor/20 dark:bg-primaryColor/30 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
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
            </div>
            <div>
              <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark">
                Marks Obtained
              </p>
              <p className="text-3xl font-bold text-blackColor dark:text-blackColor-dark">
                {marksObtained !== null && marksObtained !== undefined
                  ? `${marksObtained} / ${maxMarks}`
                  : "Not Graded"}
              </p>
              {percentage !== null && (
                <p className="text-sm text-contentColor dark:text-contentColor-dark mt-1">
                  {percentage}%
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Passing Marks Card */}
        <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded-lg p-6 border border-borderColor dark:border-borderColor-dark">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
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
            </div>
            <div>
              <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark">
                Passing Marks
              </p>
              <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
                {passingMarks}
              </p>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded-lg p-6 border border-borderColor dark:border-borderColor-dark">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-600 dark:text-blue-400"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-contentColor dark:text-contentColor-dark">
                Status
              </p>
              <span className={`inline-block mt-2 px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusBadge(status)}`}>
                {status ? status.charAt(0).toUpperCase() + status.slice(1) : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pass/Fail Indicator */}
      {hasPassed !== null && (
        <div className={`rounded-lg p-4 border-2 ${
          hasPassed
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
        }`}>
          <div className="flex items-center gap-3">
            {hasPassed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
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
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-red-600 dark:text-red-400"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            )}
            <div>
              <p className={`font-semibold ${
                hasPassed
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }`}>
                {hasPassed ? "Passed" : "Failed"}
              </p>
              <p className="text-sm text-contentColor dark:text-contentColor-dark">
                {hasPassed
                  ? `You scored ${marksObtained} marks, which meets the passing requirement of ${passingMarks} marks.`
                  : `You scored ${marksObtained} marks, which is below the passing requirement of ${passingMarks} marks.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Section */}
      {feedback && (
        <div className="bg-lightGrey5 dark:bg-darkdeep1 rounded-lg p-6 border border-borderColor dark:border-borderColor-dark">
          <h4 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-3 flex items-center gap-2">
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
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Instructor Feedback
          </h4>
          <div className="text-contentColor dark:text-contentColor-dark leading-relaxed whitespace-pre-line">
            {feedback.includes('<') ? (
              <div dangerouslySetInnerHTML={{ __html: feedback }} />
            ) : (
              <p>{feedback}</p>
            )}
          </div>
        </div>
      )}

      {/* Grading Info */}
      {gradedAt && (
        <div className="pt-4 border-t border-borderColor dark:border-borderColor-dark">
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
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Graded on: {formatDate(gradedAt)}</span>
            </div>
            {gradedBy && (
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
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Graded by: {gradedBy}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarksDisplaySection;

