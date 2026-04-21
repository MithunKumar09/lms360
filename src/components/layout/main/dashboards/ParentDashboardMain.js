"use client";

import { useState, useEffect } from "react";
import CounterParent from "@/components/sections/sub-section/dashboards/CounterParent";
import ParentStudentSelector from "@/components/sections/sub-section/dashboards/ParentStudentSelector";
import ParentChildInfoCard from "@/components/sections/sub-section/dashboards/ParentChildInfoCard";
import ParentProgressSummaryCard from "@/components/sections/sub-section/dashboards/ParentProgressSummaryCard";
import ParentActivitySummaryCard from "@/components/sections/sub-section/dashboards/ParentActivitySummaryCard";
import { useParentStudents } from "@/hooks/api/useParent";
import { useSearchParams } from "next/navigation";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";

const ParentDashboardMain = () => {
  const searchParams = useSearchParams();
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  
  // Get students to auto-select first child if available
  const { data: studentsData } = useParentStudents();
  const students = studentsData?.students || [];

  // Initialize selected student from URL or first available
  useEffect(() => {
    const urlStudentId = searchParams?.get('studentId');
    if (urlStudentId) {
      setSelectedStudentId(urlStudentId);
    } else if (students.length > 0 && !selectedStudentId) {
      // Auto-select first child if available
      setSelectedStudentId(students[0].id);
    }
  }, [searchParams, students, selectedStudentId]);

  return (
    <>
      {/* Child Selector Section */}
      <div className="mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-10px md:p-20px">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <HeadingDashboard>Parent Dashboard</HeadingDashboard>
            <p className="text-sm text-contentColor dark:text-contentColor-dark mt-2">
              Select a child to view their progress, activity, and achievements
            </p>
          </div>
          <div className="w-full md:w-80 flex-shrink-0">
            <ParentStudentSelector
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              showLabel={true}
              placeholder="Select a child..."
            />
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <CounterParent />

      {/* Selected Child Info and Summary Cards */}
      {selectedStudentId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-15px lg:gap-30px mb-30px">
          {/* Child Info Card - Full width on mobile, 1 column on desktop */}
          <div className="lg:col-span-1">
            <ParentChildInfoCard studentId={selectedStudentId} />
          </div>
          
          {/* Progress Summary Card */}
          <div className="lg:col-span-1">
            <ParentProgressSummaryCard studentId={selectedStudentId} />
          </div>
          
          {/* Activity Summary Card */}
          <div className="lg:col-span-1">
            <ParentActivitySummaryCard studentId={selectedStudentId} />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedStudentId && students.length === 0 && (
        <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-10px md:p-50px text-center">
          <div className="py-20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto text-contentColor dark:text-contentColor-dark mb-4"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <h3 className="text-xl font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              No Children Linked
            </h3>
            <p className="text-contentColor dark:text-contentColor-dark mb-4">
              You don&apos;t have any children linked to your account yet.
            </p>
            <p className="text-sm text-contentColor dark:text-contentColor-dark">
              Please contact your college administrator to link your children&apos;s accounts.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ParentDashboardMain;
