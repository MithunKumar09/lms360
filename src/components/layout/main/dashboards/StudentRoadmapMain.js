"use client";

import React from "react";
import StudentRoadmapPrimary from "@/components/sections/sub-section/dashboards/StudentRoadmapPrimary";

/**
 * StudentRoadmapMain Component
 * 
 * Main wrapper component for the student roadmap page.
 * Acts as a container for the primary roadmap content.
 */
const StudentRoadmapMain = () => {
  return (
    <div className="student-roadmap-main">
      <StudentRoadmapPrimary />
    </div>
  );
};

export default StudentRoadmapMain;
