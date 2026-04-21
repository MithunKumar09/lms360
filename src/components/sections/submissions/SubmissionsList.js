"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client.js";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown.js";
import NoData from "@/components/shared/others/NoData";

const SubmissionsList = ({ assignmentId, onSelectSubmission }) => {
  const router = useRouter();
  const [filters, setFilters] = useState({
    status: null,
    page: 1,
    limit: 20,
  });

  // Fetch submissions
  const { data, isLoading, error } = useQuery({
    queryKey: ["assignment-submissions", assignmentId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
      });
      if (filters.status) params.append("status", filters.status);

      const response = await apiClient.get(
        `/assignments/${assignmentId}/submissions?${params.toString()}`
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch submissions");
      }
      return response;
    },
    enabled: !!assignmentId,
  });

  const submissions = data?.submissions || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };
  const assignment = data?.assignment;

  const statusOptions = [
    { id: "all", label: "All Status", value: null },
    { id: "submitted", label: "Submitted", value: "submitted" },
    { id: "graded", label: "Graded", value: "graded" },
    { id: "returned", label: "Returned", value: "returned" },
  ];

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value === "all" ? null : value,
      page: 1,
    }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    // Default to 'submitted' if status is null/undefined
    const normalizedStatus = (status || 'submitted').toLowerCase();
    const badges = {
      submitted: { bg: "bg-blue-500", text: "text-white", style: { backgroundColor: '#3b82f6', color: '#ffffff' } },
      graded: { bg: "bg-green-500", text: "text-white", style: { backgroundColor: '#22c55e', color: '#ffffff' } },
      returned: { bg: "bg-purple-500", text: "text-white", style: { backgroundColor: '#a855f7', color: '#ffffff' } },
    };
    return badges[normalizedStatus] || { bg: "bg-gray-500", text: "text-white", style: { backgroundColor: '#6b7280', color: '#ffffff' } };
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
      {assignment && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
          <h3 className="font-semibold text-blackColor dark:text-blackColor-dark">
            {assignment.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Max Marks: {assignment.maxMarks}</p>
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

      {/* Submissions Table */}
      <div className="overflow-auto">
        {submissions.length === 0 ? (
          <NoData message="No submissions found" />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-borderColor dark:border-borderColor-dark">
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Student
                </th>
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Submitted At
                </th>
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Marks
                </th>
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Status
                </th>
                <th className="py-15px px-10px text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr
                  key={submission.id}
                  className="border-b border-borderColor dark:border-borderColor-dark hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="py-15px px-10px">
                    <div className="font-semibold text-blackColor dark:text-blackColor-dark">
                      {submission.studentName}
                    </div>
                    <div className="text-sm text-gray-500">{submission.studentEmail}</div>
                  </td>
                  <td className="py-15px px-10px text-sm text-contentColor dark:text-contentColor-dark">
                    {formatDate(submission.submittedAt)}
                    {submission.isLate && (
                      <span className="ml-2 text-red-600 text-xs">(Late)</span>
                    )}
                  </td>
                  <td className="py-15px px-10px text-sm text-contentColor dark:text-contentColor-dark">
                    {submission.marksObtained !== null
                      ? `${submission.marksObtained} / ${assignment?.maxMarks || "N/A"}`
                      : "Not graded"}
                  </td>
                  <td className="py-15px px-10px">
                    {(() => {
                      const badge = getStatusBadge(submission.status);
                      return (
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}
                          style={badge.style}
                        >
                          {(submission.status || 'submitted').toUpperCase()}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-15px px-10px">
                    <button
                      onClick={() => onSelectSubmission(submission.id)}
                      className="px-4 py-2 bg-primaryColor text-white rounded-md hover:bg-primaryColor/90 text-sm"
                    >
                      Review
                    </button>
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

export default SubmissionsList;

