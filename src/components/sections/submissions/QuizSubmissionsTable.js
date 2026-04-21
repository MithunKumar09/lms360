"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown.js";
import NoData from "@/components/shared/others/NoData";

const QuizSubmissionsTable = ({ quizId, onExport }) => {
  const [filters, setFilters] = useState({
    status: null,
    page: 1,
    limit: 20,
  });

  // Fetch submissions
  const { data, isLoading, error } = useQuery({
    queryKey: ["quiz-submissions", quizId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
      });
      if (filters.status) params.append("status", filters.status);

      const response = await apiClient.get(
        `/quizzes/${quizId}/submissions?${params.toString()}`
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch submissions");
      }
      return response;
    },
    enabled: !!quizId,
  });

  const attempts = data?.attempts || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };
  const quiz = data?.quiz;

  const statusOptions = [
    { id: "all", label: "All Status", value: null },
    { id: "in_progress", label: "In Progress", value: "in_progress" },
    { id: "submitted", label: "Submitted", value: "submitted" },
    { id: "timeout", label: "Timeout", value: "timeout" },
    { id: "abandoned", label: "Abandoned", value: "abandoned" },
  ];

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value === "all" ? null : value,
      page: 1,
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (seconds) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      in_progress: "bg-blue-500 text-white",
      submitted: "bg-green-500 text-white",
      timeout: "bg-red-500 text-white",
      abandoned: "bg-gray-500 text-white",
    };
    return badges[status] || "bg-gray-500 text-white";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-gray-500">Loading submissions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-red-500">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      {quiz && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blackColor dark:text-blackColor-dark">
              {quiz.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Marks: {quiz.totalMarks} | Passing Marks: {quiz.passingMarks}
            </p>
          </div>
          {onExport && (
            <button
              onClick={() => onExport(quizId)}
              className="px-4 py-2 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90"
            >
              Export Report
            </button>
          )}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
          Filter by Status
        </label>
        <AdvancedDropdown
          options={statusOptions}
          value={filters.status || "all"}
          onChange={(value) => handleFilterChange("status", value)}
          placeholder="All Status"
        />
      </div>

      {/* Table */}
      <div className="overflow-auto">
        {attempts.length === 0 ? (
          <NoData message="No submissions found" />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-borderColor dark:border-borderColor-dark">
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Student
                </th>
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Started At
                </th>
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Submitted At
                </th>
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Time Taken
                </th>
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Marks
                </th>
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr
                  key={attempt.id}
                  className="border-b border-borderColor dark:border-borderColor-dark hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="py-15px px-10px">
                    <div className="font-semibold text-blackColor dark:text-blackColor-dark">
                      {attempt.studentName}
                    </div>
                    <div className="text-sm text-gray-500">{attempt.studentEmail}</div>
                  </td>
                  <td className="py-15px px-10px text-sm text-contentColor dark:text-contentColor-dark">
                    {formatDate(attempt.startedAt)}
                  </td>
                  <td className="py-15px px-10px text-sm text-contentColor dark:text-contentColor-dark">
                    {attempt.submittedAt ? formatDate(attempt.submittedAt) : "Not submitted"}
                  </td>
                  <td className="py-15px px-10px text-sm text-contentColor dark:text-contentColor-dark">
                    {formatTime(attempt.timeTakenSeconds)}
                  </td>
                  <td className="py-15px px-10px text-sm text-contentColor dark:text-contentColor-dark">
                    {attempt.marksObtained !== null
                      ? `${attempt.marksObtained} / ${quiz?.totalMarks || "N/A"} (${attempt.percentageScore?.toFixed(1) || 0}%)`
                      : "Not graded"}
                    {attempt.isPassed !== null && (
                      <span className={`ml-2 text-xs ${attempt.isPassed ? "text-green-600" : "text-red-600"}`}>
                        {attempt.isPassed ? "✓ Pass" : "✗ Fail"}
                      </span>
                    )}
                  </td>
                  <td className="py-15px px-10px">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(
                        attempt.status
                      )}`}
                    >
                      {attempt.status.replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{" "}
            submissions
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizSubmissionsTable;

