"use client";

import React from "react";
import QuizzesGridWrapper from "@/components/sections/quizzes/QuizzesGridWrapper";
import QuizStatisticsBar from "@/components/manage/QuizStatisticsBar";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";

const SuperadminManageQuizMain = () => {
  // Fetch quizzes for statistics
  const { data: quizzesData } = useQuery({
    queryKey: ["quizzes", "superadmin", "stats"],
    queryFn: async () => {
      const response = await apiClient.get("/quizzes?limit=1000");
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch quizzes");
      }
      return response;
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const quizzes = quizzesData?.quizzes || [];

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-blackColor dark:text-blackColor-dark mb-4">
          Manage Quiz
        </h1>
      </div>
      
      <QuizStatisticsBar
        quizzes={quizzes}
        isLoading={!quizzesData}
        className="mb-6"
      />

      <QuizzesGridWrapper role="superadmin" />
    </div>
  );
};

export default SuperadminManageQuizMain;

