"use client";

import React from "react";
import AddAssignmentForm from "@/components/sections/assignments/AddAssignmentForm";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";

const InstructorAddAssignmentMain = () => {
  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <HeadingDashboard>Add Assignment</HeadingDashboard>
      <AddAssignmentForm />
    </div>
  );
};

export default InstructorAddAssignmentMain;

