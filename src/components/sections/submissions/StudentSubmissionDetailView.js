"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import SubmissionMessages from "./SubmissionMessages";
import SubmissionCarousel from "./SubmissionCarousel";
import MarksDisplaySection from "./MarksDisplaySection";
import NoData from "@/components/shared/others/NoData";

const StudentSubmissionDetailView = ({ submissionId }) => {
  // Fetch submission details
  const { data, isLoading, error } = useQuery({
    queryKey: ["submission", "student", submissionId],
    queryFn: async () => {
      const response = await apiClient.get(`/assignments/submissions/${submissionId}`);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch submission");
      }
      return response;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Loading submission...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500">Error: {error.message}</p>
      </div>
    );
  }

  if (!data?.submission) {
    return <NoData message="Submission not found" />;
  }

  const submission = data.submission;

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
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
              {submission.assignmentTitle}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Submitted on: {formatDate(submission.submittedAt)}
              {submission.isLate && (
                <span className="ml-2 text-red-600 font-semibold">(Late Submission)</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Max Marks</p>
            <p className="text-lg font-bold text-blackColor dark:text-blackColor-dark">
              {submission.maxMarks}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content: Messages and Carousel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Messages (40%) */}
        <div className="lg:col-span-2" style={{ minHeight: "600px" }}>
          <SubmissionMessages
            submissionId={submissionId}
            studentName={submission.studentName}
            studentAvatar={submission.studentAvatar}
          />
        </div>

        {/* Right: Carousel (60%) */}
        <div className="lg:col-span-3" style={{ minHeight: "600px" }}>
          <SubmissionCarousel files={submission.files || []} />
        </div>
      </div>

      {/* Bottom: Marks Display Section */}
      <div>
        <MarksDisplaySection submission={submission} />
      </div>
    </div>
  );
};

export default StudentSubmissionDetailView;

