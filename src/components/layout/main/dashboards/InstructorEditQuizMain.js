"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import AddQuizForm from "@/components/sections/quizzes/AddQuizForm";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";

const InstructorEditQuizMain = () => {
  const searchParams = useSearchParams();
  const quizId = searchParams.get('id');

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <HeadingDashboard>Edit Quiz</HeadingDashboard>
      {quizId ? (
        <AddQuizForm role="instructor" quizId={quizId} />
      ) : (
        <div className="text-red-500 py-4">
          Quiz ID is required
        </div>
      )}
    </div>
  );
};

export default InstructorEditQuizMain;

