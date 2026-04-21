"use client";

import React from "react";
import AssignmentsTable from "@/components/sections/assignments/AssignmentsTable";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import Link from "next/link";

const InstructorManageAssignmentsMain = () => {
  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <HeadingDashboard path="/dashboards/instructor-add-assignment">
        Manage Assignments
      </HeadingDashboard>
      <div className="mb-4">
        <Link
          href="/dashboards/instructor-add-assignment"
          className="inline-flex items-center px-4 py-2 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90 transition-colors"
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
            className="mr-2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          Add New Assignment
        </Link>
      </div>
      <AssignmentsTable />
    </div>
  );
};

export default InstructorManageAssignmentsMain;

