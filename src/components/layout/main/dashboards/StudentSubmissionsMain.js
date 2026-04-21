"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import StudentSubmissionDetailView from "@/components/sections/submissions/StudentSubmissionDetailView";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";

const StudentSubmissionsMain = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const submissionIdFromUrl = searchParams.get("submissionId");
  const assignmentIdFromUrl = searchParams.get("assignmentId");

  const [selectedSubmissionId, setSelectedSubmissionId] = useState(
    submissionIdFromUrl || null
  );

  const handleBackToAssignment = () => {
    if (assignmentIdFromUrl) {
      router.push(`/dashboards/student-assignment-details?assignmentId=${assignmentIdFromUrl}&view=true`);
    } else {
      router.back();
    }
  };

  if (selectedSubmissionId) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6">
          <button
            onClick={handleBackToAssignment}
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
            Back to Assignment Details
          </button>
          <HeadingDashboard>Review Submission</HeadingDashboard>
        </div>
        <StudentSubmissionDetailView submissionId={selectedSubmissionId} />
      </div>
    );
  }

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <div className="text-center py-20 text-gray-500">
        <p>No submission selected. Please navigate from an assignment details page.</p>
        <button
          onClick={handleBackToAssignment}
          className="mt-4 px-4 py-2 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default StudentSubmissionsMain;

