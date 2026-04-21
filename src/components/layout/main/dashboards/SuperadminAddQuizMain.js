"use client";

import React from "react";
import AddQuizForm from "@/components/sections/quizzes/AddQuizForm";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";

const SuperadminAddQuizMain = () => {
  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <HeadingDashboard>Add Quiz</HeadingDashboard>
      <AddQuizForm role="superadmin" />
    </div>
  );
};

export default SuperadminAddQuizMain;

