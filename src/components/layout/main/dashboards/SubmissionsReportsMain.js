"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import QuizSubmissionsTable from "@/components/sections/submissions/QuizSubmissionsTable";
import SubmissionsAnalytics from "@/components/sections/submissions/SubmissionsAnalytics";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import { useAuthStore } from "@/store/index.js";

const SubmissionsReportsMain = ({ role = "admin" }) => {
  const user = useAuthStore((state) => state.user);
  const createAlert = useSweetAlert();
  const [selectedQuizId, setSelectedQuizId] = useState(null);

  // Fetch quizzes for selection
  const { data: quizzesData, isLoading: isLoadingQuizzes } = useQuery({
    queryKey: ["quizzes", role],
    queryFn: async () => {
      const response = await apiClient.get("/quizzes?limit=1000");
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch quizzes");
      }
      return response;
    },
  });

  const quizzes = quizzesData?.quizzes || [];
  const quizOptions = [
    { id: "none", label: "Select a quiz...", value: null },
    ...quizzes.map((quiz) => ({
      id: quiz.id,
      label: `${quiz.title}${quiz.courseTitle ? ` (${quiz.courseTitle})` : " (Standalone)"}`,
      value: quiz.id,
    })),
  ];

  // Fetch analytics
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["quiz-analytics", selectedQuizId],
    queryFn: async () => {
      const response = await apiClient.get(`/quizzes/${selectedQuizId}/analytics`);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch analytics");
      }
      return response;
    },
    enabled: !!selectedQuizId,
  });

  const analytics = analyticsData?.analytics;

  const handleExport = async (quizId) => {
    try {
      // For now, we'll create a simple CSV export
      // In the future, this can call an API endpoint for PDF/CSV generation
      const response = await apiClient.get(`/quizzes/${quizId}/submissions?limit=10000`);
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch data for export");
      }

      const attempts = response.attempts || [];
      const quiz = response.quiz;

      // Create CSV content
      const headers = ["Student Name", "Student Email", "Started At", "Submitted At", "Time Taken (seconds)", "Marks", "Percentage", "Status", "Passed"];
      const rows = attempts.map((attempt) => [
        attempt.studentName,
        attempt.studentEmail,
        attempt.startedAt || "",
        attempt.submittedAt || "",
        attempt.timeTakenSeconds || "",
        attempt.marksObtained || "",
        attempt.percentageScore || "",
        attempt.status,
        attempt.isPassed ? "Yes" : attempt.isPassed === false ? "No" : "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      // Download CSV
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `quiz-submissions-${quizId}-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      createAlert({
        icon: "success",
        title: "Success!",
        text: "Report exported successfully",
      });
    } catch (error) {
      createAlert({
        icon: "error",
        title: "Error!",
        text: error.message || "Failed to export report",
      });
    }
  };

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <HeadingDashboard>Submissions & Reports</HeadingDashboard>

      {/* Quiz Selection */}
      <div className="mb-6">
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Select Quiz
        </label>
        <AdvancedDropdown
          options={quizOptions}
          value={selectedQuizId || "none"}
          onChange={(quizId) => setSelectedQuizId(quizId === "none" ? null : quizId)}
          placeholder="Select a quiz..."
          searchable={true}
          loading={isLoadingQuizzes}
        />
      </div>

      {selectedQuizId ? (
        <>
          {/* Analytics */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-4">
              Analytics
            </h3>
            {isLoadingAnalytics ? (
              <div className="text-center py-10 text-gray-500">Loading analytics...</div>
            ) : (
              <SubmissionsAnalytics analytics={analytics} role={role} />
            )}
          </div>

          <hr className="my-6 border-contentColor opacity-35" />

          {/* Submissions Table */}
          <div>
            <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-4">
              Submissions
            </h3>
            <QuizSubmissionsTable quizId={selectedQuizId} onExport={handleExport} />
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <p>Please select a quiz to view submissions and analytics</p>
        </div>
      )}
    </div>
  );
};

export default SubmissionsReportsMain;

