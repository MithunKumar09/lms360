"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import AddAssignmentForm from "@/components/sections/assignments/AddAssignmentForm";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";

const InstructorEditAssignmentMain = () => {
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get('id');

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <HeadingDashboard>Edit Assignment</HeadingDashboard>
      {assignmentId ? (
        <AddAssignmentForm assignmentId={assignmentId} />
      ) : (
        <div className="text-red-500 py-4">
          Assignment ID is required
        </div>
      )}
    </div>
  );
};

export default InstructorEditAssignmentMain;

